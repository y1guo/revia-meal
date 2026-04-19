'use client'

import { AlertCircle, AlertTriangle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import {
    Modal,
    ModalBody,
    ModalClose,
    ModalFooter,
    ModalIcon,
    ModalTargetChip,
    ModalTitle,
    ModalWarning,
} from './Modal'

type DestructiveConfirmModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    target: ReactNode
    children: ReactNode
    warning?: string
    destructiveLabel: string
    onConfirm: () => void | Promise<void>
}

export function DestructiveConfirmModal({
    open,
    onOpenChange,
    title,
    target,
    children,
    warning,
    destructiveLabel,
    onConfirm,
}: DestructiveConfirmModalProps) {
    const [busy, setBusy] = useState(false)

    const handleConfirm = async () => {
        setBusy(true)
        try {
            await onConfirm()
            onOpenChange(false)
        } finally {
            setBusy(false)
        }
    }

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <ModalIcon tone="destructive">
                <AlertTriangle size={20} strokeWidth={1.75} />
            </ModalIcon>
            <ModalTitle>{title}</ModalTitle>
            <ModalTargetChip>{target}</ModalTargetChip>
            <ModalBody>{children}</ModalBody>
            {warning && (
                <ModalWarning>
                    <AlertCircle
                        size={16}
                        strokeWidth={1.75}
                        className="mt-0.5 shrink-0 text-danger-700 dark:text-danger-400"
                        aria-hidden="true"
                    />
                    <span>{warning}</span>
                </ModalWarning>
            )}
            <ModalFooter>
                {/* Cancel is first — Radix Dialog auto-focuses first focusable element. */}
                <ModalClose asChild>
                    <Button variant="ghost" disabled={busy}>
                        Cancel
                    </Button>
                </ModalClose>
                <Button
                    variant="destructive"
                    loading={busy}
                    onClick={handleConfirm}
                >
                    {destructiveLabel}
                </Button>
            </ModalFooter>
        </Modal>
    )
}
