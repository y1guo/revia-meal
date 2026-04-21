// Applies SQL migrations in db/migrations/ to the database referenced by
// DATABASE_URL. Tracks applied files in a `schema_migrations` table keyed by
// filename + sha256 checksum, so a re-run is a no-op and an edit to an already-
// applied migration trips the checksum guard instead of silently diverging.
//
// Modes:
//   pnpm migrate              — apply any pending migration files in order
//   pnpm migrate:status       — list applied + pending; no writes
//   pnpm migrate:baseline     — mark every current file as applied WITHOUT
//                               running it. Use ONCE on existing environments
//                               where these migrations were already applied
//                               manually via the SQL editor.
//
// The schema_migrations table is created automatically if it doesn't exist;
// it isn't itself a tracked migration (would be chicken-and-egg).

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'db/migrations')

type Row = { filename: string; checksum: string; applied_at: Date }

function readMigrations(): { filename: string; body: string; checksum: string }[] {
    const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort()
    return files.map((filename) => {
        const body = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8')
        // Normalize line endings before hashing so a Windows checkout with
        // autocrlf doesn't produce a different sha than a mac/linux one.
        const normalized = body.replace(/\r\n/g, '\n')
        const checksum = crypto.createHash('sha256').update(normalized).digest('hex')
        return { filename, body, checksum }
    })
}

function shortSum(s: string): string {
    return s.slice(0, 12)
}

async function main() {
    const url = process.env.DATABASE_URL
    if (!url) {
        console.error(
            'Missing DATABASE_URL. Grab the direct Postgres connection string\n' +
                'from Supabase (Project Settings → Database → Connection string →\n' +
                'URI, with "Use connection pooling" OFF — the pooler runs in\n' +
                'transaction mode and blocks DDL) and put it in .env.local as\n' +
                '    DATABASE_URL=postgres://postgres:PASSWORD@HOST:5432/postgres',
        )
        process.exit(1)
    }

    const argv = process.argv.slice(2)
    const mode = argv.includes('--baseline')
        ? 'baseline'
        : argv.includes('--status')
          ? 'status'
          : 'apply'

    const sql = postgres(url, {
        // Each DDL runs in its own tx below; no prepared statements needed.
        prepare: false,
        // Supabase requires SSL; postgres.js autodetects this from the URL
        // (postgres://…?sslmode=require) or we can force it here if the URL
        // omits it. Keep default behavior for flexibility.
    })

    try {
        await sql`
            create table if not exists public.schema_migrations (
                filename text primary key,
                checksum text not null,
                applied_at timestamptz not null default now()
            )
        `

        const applied = await sql<Row[]>`
            select filename, checksum, applied_at
            from public.schema_migrations
            order by filename
        `
        const appliedMap = new Map(applied.map((r) => [r.filename, r]))

        const migrations = readMigrations()
        const fileSet = new Set(migrations.map((m) => m.filename))

        // Any tracking rows that no longer have a matching file: surface as a
        // warning. Don't auto-delete; deleting a committed migration should be
        // a conscious human decision.
        const orphaned = applied.filter((r) => !fileSet.has(r.filename))

        if (mode === 'status') {
            console.log('Tracked migrations:')
            if (applied.length === 0) {
                console.log('  (none — baseline or apply to get started)')
            } else {
                for (const r of applied) {
                    const onDisk = migrations.find((m) => m.filename === r.filename)
                    const tag = !onDisk
                        ? 'ORPHANED (file removed)'
                        : onDisk.checksum !== r.checksum
                          ? 'CHECKSUM MISMATCH'
                          : 'ok'
                    console.log(
                        `  ${r.filename}  [${shortSum(r.checksum)}]  ${r.applied_at.toISOString()}  — ${tag}`,
                    )
                }
            }
            const pending = migrations.filter((m) => !appliedMap.has(m.filename))
            console.log(`\nPending files: ${pending.length}`)
            for (const m of pending) {
                console.log(`  ${m.filename}  [${shortSum(m.checksum)}]`)
            }
            return
        }

        if (mode === 'baseline') {
            if (applied.length > 0) {
                console.error(
                    `Refusing to baseline: schema_migrations already has ${applied.length} row(s).\n` +
                        'Run `pnpm migrate:status` to inspect, or manually truncate the\n' +
                        'table if you really want to re-baseline.',
                )
                process.exit(1)
            }
            if (migrations.length === 0) {
                console.log('No migration files to baseline.')
                return
            }
            console.log(
                `Baselining: marking ${migrations.length} file(s) as applied WITHOUT running them.`,
            )
            // Wrap in a transaction so Ctrl-C mid-run doesn't leave the
            // tracking table in a partial state (which would then silently
            // skip un-recorded migrations on the next `pnpm migrate`).
            await sql.begin(async (tx) => {
                for (const m of migrations) {
                    await tx`
                        insert into public.schema_migrations (filename, checksum)
                        values (${m.filename}, ${m.checksum})
                    `
                    console.log(`  recorded ${m.filename}  [${shortSum(m.checksum)}]`)
                }
            })
            console.log('Done. Future `pnpm migrate` runs will apply only new files.')
            return
        }

        // apply mode
        if (orphaned.length > 0) {
            console.warn(
                'Warning: tracking rows reference files that are no longer on disk:',
            )
            for (const o of orphaned) console.warn(`  ${o.filename}`)
            console.warn(
                'This is usually fine (the file was intentionally removed), but if\n' +
                    'it was accidental you should restore the file before continuing.',
            )
        }

        // Checksum guard: every already-applied file must still match its
        // recorded sha. Editing a committed migration in place breaks replays
        // and creates undetectable drift between environments.
        for (const m of migrations) {
            const rec = appliedMap.get(m.filename)
            if (rec && rec.checksum !== m.checksum) {
                console.error(
                    `Checksum mismatch for ${m.filename}:\n` +
                        `  on disk:  ${m.checksum}\n` +
                        `  recorded: ${rec.checksum} (applied ${rec.applied_at.toISOString()})\n` +
                        'Do not edit migrations that have already been applied. Write a\n' +
                        'new migration that amends the schema instead.',
                )
                process.exit(1)
            }
        }

        const pending = migrations.filter((m) => !appliedMap.has(m.filename))
        if (pending.length === 0) {
            console.log('No pending migrations. Database is up to date.')
            return
        }

        console.log(`Applying ${pending.length} migration(s)...`)
        for (const m of pending) {
            process.stdout.write(`  ${m.filename}  [${shortSum(m.checksum)}] ... `)
            try {
                await sql.begin(async (tx) => {
                    await tx.unsafe(m.body)
                    await tx`
                        insert into public.schema_migrations (filename, checksum)
                        values (${m.filename}, ${m.checksum})
                    `
                })
                console.log('ok')
            } catch (err) {
                console.log('FAILED')
                console.error(err instanceof Error ? err.message : err)
                process.exit(1)
            }
        }
        console.log('All pending migrations applied.')
    } finally {
        await sql.end({ timeout: 5 })
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.stack ?? err.message : err)
    process.exit(1)
})
