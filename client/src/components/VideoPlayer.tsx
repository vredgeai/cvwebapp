import React, { forwardRef } from 'react';

interface VideoPlayerProps {
    videoFile: File;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({ videoFile }, ref) => {
    return (
        <video
            ref={ref}
            src={URL.createObjectURL(videoFile)}
            controls
            className="img-fluid"
        ></video>
    );
});

export default React.memo(VideoPlayer);
