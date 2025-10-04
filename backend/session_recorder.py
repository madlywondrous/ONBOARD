"""
Session Recording System for F1 Live Timing
Saves session data for replay and historical analysis
"""

import json
import os
from datetime import datetime
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class SessionRecorder:
    """Records F1 session data for replay"""
    
    def __init__(self, storage_dir: str = "recordings"):
        self.storage_dir = storage_dir
        self.current_session_id = None
        self.current_session_file = None
        self.is_recording = False
        self.frame_count = 0
        
        # Create storage directory
        os.makedirs(storage_dir, exist_ok=True)
    
    def start_recording(self, session_info: Dict[str, Any]):
        """Start recording a new session"""
        try:
            # Generate session ID from meeting info
            meeting = session_info.get('Meeting', {})
            session_type = session_info.get('Type', 'Unknown')
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            meeting_name = meeting.get('Name', 'Unknown').replace(' ', '_')
            self.current_session_id = f"{timestamp}_{meeting_name}_{session_type}"
            
            # Create session directory
            session_dir = os.path.join(self.storage_dir, self.current_session_id)
            os.makedirs(session_dir, exist_ok=True)
            
            # Save session metadata
            metadata = {
                "session_id": self.current_session_id,
                "recording_started": timestamp,
                "meeting": meeting,
                "session_type": session_type,
                "session_info": session_info
            }
            
            metadata_file = os.path.join(session_dir, "metadata.json")
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Open data file for streaming writes
            self.current_session_file = os.path.join(session_dir, "data.jsonl")
            self.is_recording = True
            self.frame_count = 0
            
            logger.info(f"📹 Started recording session: {self.current_session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start recording: {e}")
            return False
    
    def record_frame(self, data: Dict[str, Any]):
        """Record a single frame of data"""
        if not self.is_recording or not self.current_session_file:
            return
        
        try:
            frame = {
                "frame": self.frame_count,
                "timestamp": datetime.now().isoformat(),
                "data": data
            }
            
            # Append to JSONL file
            with open(self.current_session_file, 'a') as f:
                f.write(json.dumps(frame) + '\n')
            
            self.frame_count += 1
            
        except Exception as e:
            logger.error(f"Failed to record frame: {e}")
    
    def stop_recording(self):
        """Stop recording current session"""
        if not self.is_recording:
            return
        
        try:
            # Update metadata with final stats
            if self.current_session_id:
                session_dir = os.path.join(self.storage_dir, self.current_session_id)
                metadata_file = os.path.join(session_dir, "metadata.json")
                
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                metadata["recording_ended"] = datetime.now().strftime("%Y%m%d_%H%M%S")
                metadata["total_frames"] = self.frame_count
                
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
            
            logger.info(f"⏹️  Stopped recording: {self.current_session_id} ({self.frame_count} frames)")
            
            self.is_recording = False
            self.current_session_file = None
            
        except Exception as e:
            logger.error(f"Failed to stop recording: {e}")
    
    def list_recordings(self):
        """List all available recordings"""
        try:
            recordings = []
            
            for session_dir in os.listdir(self.storage_dir):
                metadata_file = os.path.join(self.storage_dir, session_dir, "metadata.json")
                
                if os.path.exists(metadata_file):
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                        recordings.append(metadata)
            
            # Sort by recording time (newest first)
            recordings.sort(key=lambda x: x.get('recording_started', ''), reverse=True)
            return recordings
            
        except Exception as e:
            logger.error(f"Failed to list recordings: {e}")
            return []
    
    def get_recording(self, session_id: str):
        """Get metadata for a specific recording"""
        try:
            metadata_file = os.path.join(self.storage_dir, session_id, "metadata.json")
            
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r') as f:
                    return json.load(f)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get recording: {e}")
            return None
    
    def load_recording_frames(self, session_id: str, start_frame: int = 0, count: int = 100):
        """Load frames from a recording"""
        try:
            data_file = os.path.join(self.storage_dir, session_id, "data.jsonl")
            
            if not os.path.exists(data_file):
                return []
            
            frames = []
            with open(data_file, 'r') as f:
                for i, line in enumerate(f):
                    if i < start_frame:
                        continue
                    if len(frames) >= count:
                        break
                    
                    try:
                        frame = json.loads(line)
                        frames.append(frame)
                    except:
                        continue
            
            return frames
            
        except Exception as e:
            logger.error(f"Failed to load recording frames: {e}")
            return []
    
    def get_latest_recording(self):
        """Get the most recent recording"""
        recordings = self.list_recordings()
        return recordings[0] if recordings else None


# Global recorder instance
recorder = SessionRecorder()
