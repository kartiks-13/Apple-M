/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Track {
  id: string;
  file: File;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl?: string;
}

export interface PlayerState {
  currentTrackIndex: number | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
}
