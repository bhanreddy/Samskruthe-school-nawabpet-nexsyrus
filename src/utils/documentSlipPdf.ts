import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Print HTML directly using an isolated hidden iframe on web to completely exclude
 * the application shell, top bar, and sidebar from the printed paper.
 */
export async function printSlipsOnWeb(fullHtml: string): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'fee-due-slips-print');
    iframe.setAttribute(
      'style',
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;visibility:hidden;'
    );
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      reject(new Error('Could not open print preview frame.'));
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        iframe.remove();
      } catch {
        /* ignore */
      }
      resolve();
    };

    const runPrint = () => {
      try {
        win.focus();
        win.print();
      } catch (err) {
        finish();
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      win.addEventListener('afterprint', finish);
      setTimeout(finish, 6000);
    };

    doc.open();
    doc.write(fullHtml);
    doc.close();
    setTimeout(runPrint, 500);
  });
}

/**
 * Print or generate PDF on mobile or web.
 */
export async function printOrSaveSlips(html: string, filename = 'Fee-Due-Slips.pdf'): Promise<void> {
  if (Platform.OS === 'web') {
    await printSlipsOnWeb(html);
    return;
  }

  // Native iOS / Android via expo-print
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: filename,
      });
    } else {
      await Print.printAsync({ html });
    }
  } catch (error) {
    console.error('[documentSlipPdf] Native print failed:', error);
    throw error;
  }
}

/**
 * Client-side file downloader for Blobs (Excel, CSV, DOCX, ZIP, PDF).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      a.remove();
    }, 1000);
  }
}

/**
 * Downloads plain text / CSV.
 */
export function downloadTextFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8'): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const blob = new Blob([content], { type: mimeType });
    downloadBlob(blob, filename);
  }
}
