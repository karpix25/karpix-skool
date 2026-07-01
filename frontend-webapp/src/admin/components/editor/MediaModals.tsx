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
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-[24px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-blue-500" />
                        Добавить ссылку
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        value={url}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl focus:ring-blue-500"
                    />
                </div>
                <DialogFooter className="flex sm:flex-row gap-2">
                    <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl">
                        Отмена
                    </Button>
                    <Button
                        onClick={() => { onConfirm(url); onClose(); }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20"
                    >
                        Добавить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
