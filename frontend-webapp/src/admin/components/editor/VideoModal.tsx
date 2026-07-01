import React, { useState } from 'react';
import axios from "axios";
import * as UpChunk from "@mux/upchunk";
import { AlertCircle, Link2, Upload } from "lucide-react";

import api from "../../../api/client";
import { Button } from "../../../components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Progress as ProgressBar } from "../../../components/ui/progress";

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

            const res = await api.get(`/video/upload-url?lesson_id=${lessonId}`);
            const { upload_url } = res.data;
            const upload = UpChunk.createUpload({
                endpoint: upload_url,
                file,
                chunkSize: 5120,
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
                onConfirm('', 'mux');
                onClose();
            });
        } catch (err) {
            console.error('Mux upload error:', err);
            const msg = axios.isAxiosError<{ detail?: string }>(err)
                ? err.response?.data?.detail || 'Could not initialize upload.'
                : 'Could not initialize upload.';
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
