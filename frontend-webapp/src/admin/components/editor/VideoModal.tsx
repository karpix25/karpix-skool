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
            <DialogContent className="sm:max-w-md bg-card border-border rounded-2xl p-6 sm:p-8 shadow-md">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-semibold text-foreground">
                        Add a video
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {!uploading && (
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Link2 className="w-5 h-5" />
                            </div>
                            <Input
                                value={url}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                                placeholder="YouTube, Loom, Vimeo link"
                                className="pl-12 h-12 bg-muted/30 border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-base"
                            />
                        </div>
                    )}

                    {uploading ? (
                        <div className="space-y-4 py-8">
                            <div className="flex items-center justify-between text-sm font-medium">
                                <span className="text-muted-foreground">Uploading video...</span>
                                <span className="text-primary">{progress}%</span>
                            </div>
                            <ProgressBar value={progress} className="h-2 bg-muted" />
                            <p className="text-xs text-muted-foreground text-center italic">
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
                                className="border border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-4 bg-muted/30 group hover:border-primary/50 transition-colors cursor-pointer"
                            >
                                <div className="w-14 h-14 rounded-lg bg-card shadow-sm border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <span className="text-primary font-semibold hover:underline decoration-2 underline-offset-4">Select file</span>
                                    <p className="text-sm text-muted-foreground mt-1">Upload directly to Mux</p>
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-8 flex flex-col gap-3">
                    <Button
                        disabled={!url || uploading}
                        onClick={() => { onConfirm(url, 'youtube'); onClose(); setUrl(''); }}
                        className="h-12 w-full bg-muted text-muted-foreground font-bold rounded-lg transition-all disabled:opacity-50 data-[active=true]:bg-primary data-[active=true]:text-white"
                        data-active={url && !uploading ? 'true' : undefined}
                    >
                        ADD BY LINK
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={uploading}
                        className="h-12 w-full text-muted-foreground font-semibold hover:bg-muted rounded-lg text-xs"
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
