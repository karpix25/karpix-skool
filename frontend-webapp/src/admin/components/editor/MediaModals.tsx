import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
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

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (url: string) => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [url, setUrl] = useState('');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-[28px] p-8 shadow-2xl">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                        Add a video
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* URL Input */}
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Link2 className="w-5 h-5" />
                        </div>
                        <Input
                            value={url}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                            placeholder="YouTube, Loom, Vimeo, or Wistia link"
                            className="pl-12 h-14 bg-white dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-base"
                        />
                    </div>

                    {/* File Upload Placeholder */}
                    <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[24px] p-10 flex flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-white/[0.02] group hover:border-blue-500/50 transition-colors cursor-not-allowed opacity-60">
                        <div className="w-16 h-16 rounded-full bg-white dark:bg-white/5 shadow-sm flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-3xl">upload</span>
                        </div>
                        <div className="text-center">
                            <button className="text-blue-600 font-semibold hover:underline decoration-2 underline-offset-4">Select file</button>
                            <p className="text-sm text-slate-400 mt-1">Files can be uploaded later</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-8 flex flex-col gap-3">
                    <Button
                        disabled={!url}
                        onClick={() => { onConfirm(url); onClose(); setUrl(''); }}
                        className="h-12 w-full bg-[#e2e8f0] dark:bg-slate-700 text-slate-400 font-bold rounded-xl transition-all disabled:opacity-50"
                        style={url ? { backgroundColor: '#135bec', color: 'white' } : {}}
                    >
                        ADD
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="h-12 w-full text-slate-500 font-semibold hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl uppercase tracking-wider text-xs"
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
