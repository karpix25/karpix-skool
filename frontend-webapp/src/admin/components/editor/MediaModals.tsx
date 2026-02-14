import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../../../components/ui/dialog";
import { Progress as ProgressBar } from "../../../components/ui/progress";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Upload, AlertCircle, Link2 } from "lucide-react";
import * as UpChunk from "@mux/upchunk";
import api from "../../../api/client";

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
    onConfirm: (url: string, type?: 'youtube' | 'mux', playbackId?: string) => void;
    lessonId?: string;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, onConfirm, lessonId }) => {
    const [url, setUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !lessonId) return;

        try {
            setUploading(true);
            setError(null);
            setProgress(0);

            // 1. Get upload URL from our backend
            const res = await api.get(`/video/upload-url?lesson_id=${lessonId}`);
            const { upload_url } = res.data;

            // 2. Upload to Mux using UpChunk
            const upload = UpChunk.createUpload({
                endpoint: upload_url,
                file: file,
                chunkSize: 5120, // 5MB chunks
            });

            upload.on('error', () => {
                setError('Upload failed. Please try again.');
                setUploading(false);
            });

            upload.on('progress', (progressEvent) => {
                setProgress(Math.floor(progressEvent.detail));
            });

            upload.on('success', () => {
                setUploading(false);
                setProgress(100);
                // We'll wait for the webhook to make it "ready" in the background
                // but we can already set it as mux in the editor if we want,
                // or just let the user know it's processing.
                onConfirm('', 'mux');
                onClose();
            });

        } catch (err: any) {
            console.error('Mux upload error:', err);
            const msg = err.response?.data?.detail || 'Could not initialize upload.';
            setError(msg);
            setUploading(false);
        }
    };

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
                    {!uploading && (
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Link2 className="w-5 h-5" />
                            </div>
                            <Input
                                value={url}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                                placeholder="YouTube, Loom, Vimeo link"
                                className="pl-12 h-14 bg-white dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-base"
                            />
                        </div>
                    )}

                    {/* File Upload Section */}
                    {uploading ? (
                        <div className="space-y-4 py-8">
                            <div className="flex items-center justify-between text-sm font-medium">
                                <span className="text-slate-500">Uploading video...</span>
                                <span className="text-blue-600">{progress}%</span>
                            </div>
                            <ProgressBar value={progress} className="h-2 bg-slate-100 dark:bg-white/5" />
                            <p className="text-xs text-slate-400 text-center italic">
                                Do not close this window until finished
                            </p>
                        </div>
                    ) : (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="video/*"
                                onChange={handleFileSelect}
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[24px] p-10 flex flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-white/[0.02] group hover:border-blue-500/50 transition-colors cursor-pointer"
                            >
                                <div className="w-16 h-16 rounded-full bg-white dark:bg-white/5 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <span className="text-blue-600 font-semibold hover:underline decoration-2 underline-offset-4">Select file</span>
                                    <p className="text-sm text-slate-400 mt-1">Upload directly to Mux</p>
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-500/10 p-3 rounded-xl">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-8 flex flex-col gap-3">
                    <Button
                        disabled={!url || uploading}
                        onClick={() => { onConfirm(url, 'youtube'); onClose(); setUrl(''); }}
                        className="h-12 w-full bg-[#e2e8f0] dark:bg-slate-700 text-slate-400 font-bold rounded-xl transition-all disabled:opacity-50"
                        style={url && !uploading ? { backgroundColor: '#135bec', color: 'white' } : {}}
                    >
                        ADD BY LINK
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={uploading}
                        className="h-12 w-full text-slate-500 font-semibold hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl uppercase tracking-wider text-xs"
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
