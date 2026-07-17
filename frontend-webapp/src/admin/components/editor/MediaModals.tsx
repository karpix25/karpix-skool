import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Link2 } from "lucide-react";

interface LinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (url: string) => void;
    initialUrl?: string;
}

export const LinkModal: React.FC<LinkModalProps> = ({ isOpen, onClose, onConfirm, initialUrl = '' }) => {
    const [url, setUrl] = useState(initialUrl);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card border-border rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-primary" />
                        Добавить ссылку
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        value={url}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="bg-muted/30 border-border rounded-lg focus:ring-primary"
                    />
                </div>
                <DialogFooter className="flex sm:flex-row gap-2">
                    <Button variant="ghost" onClick={onClose} className="flex-1 rounded-lg">
                        Отмена
                    </Button>
                    <Button
                        onClick={() => { onConfirm(url); onClose(); }}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm"
                    >
                        Добавить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
