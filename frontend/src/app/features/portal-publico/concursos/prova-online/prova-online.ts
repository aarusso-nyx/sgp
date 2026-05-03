import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

type SessionState = 'setup' | 'ready' | 'running' | 'blocked' | 'submitted';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-publico-prova-online',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prova-online.html',
  styleUrl: './prova-online.scss',
})
export class PortalPublicoProvaOnline implements OnDestroy {
  @ViewChild('cameraPreview') cameraPreview?: ElementRef<HTMLVideoElement>;
  @ViewChild('screenPreview') screenPreview?: ElementRef<HTMLVideoElement>;

  state: SessionState = 'setup';
  remainingSeconds = 5400;
  consentAccepted = false;
  blockReason = '';
  sessionId = '';
  recording = false;
  snapshotIntervalSeconds = 15;
  lastSnapshotAt = '';
  private cameraStream?: MediaStream;
  private screenStream?: MediaStream;
  private countdownHandle?: number;
  private snapshotHandle?: number;

  async requestMedia(): Promise<void> {
    if (!this.consentAccepted) {
      this.block('CONSENT_REQUIRED');
      return;
    }
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      this.bindPreview(this.cameraPreview?.nativeElement, this.cameraStream);
      this.bindPreview(this.screenPreview?.nativeElement, this.screenStream);
      this.screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        this.block('SCREEN_SHARE_LOST');
      });
      this.state = 'ready';
    } catch {
      this.block('MEDIA_DENIED');
    }
  }

  start(): void {
    if (!this.cameraStream || !this.screenStream) {
      this.block('MEDIA_DENIED');
      return;
    }
    this.sessionId = this.sessionId || crypto.randomUUID();
    this.recording = true;
    this.state = 'running';
    this.countdownHandle = window.setInterval(() => {
      this.remainingSeconds -= 1;
      if (this.remainingSeconds <= 0) this.submit();
    }, 1000);
    this.snapshotHandle = window.setInterval(() => {
      this.lastSnapshotAt = new Date().toISOString();
    }, this.snapshotIntervalSeconds * 1000);
  }

  submit(): void {
    this.stopTimers();
    this.stopStreams();
    this.recording = false;
    this.state = 'submitted';
  }

  ngOnDestroy(): void {
    this.stopTimers();
    this.stopStreams();
  }

  private bindPreview(preview: HTMLVideoElement | undefined, stream: MediaStream): void {
    if (!preview) return;
    preview.srcObject = stream;
    void preview.play();
  }

  private block(reason: string): void {
    this.stopTimers();
    this.stopStreams();
    this.recording = false;
    this.blockReason = reason;
    this.state = 'blocked';
  }

  private stopStreams(): void {
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.screenStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream = undefined;
    this.screenStream = undefined;
  }

  private stopTimers(): void {
    if (this.countdownHandle) window.clearInterval(this.countdownHandle);
    if (this.snapshotHandle) window.clearInterval(this.snapshotHandle);
    this.countdownHandle = undefined;
    this.snapshotHandle = undefined;
  }

  get remainingLabel(): string {
    const minutes = Math.floor(this.remainingSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (this.remainingSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}
