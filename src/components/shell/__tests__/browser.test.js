import { describe, expect, it } from 'vitest';
import { detectPrintBrowser } from '../browser';

const UA = {
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  edgeWin:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  firefoxWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0',
  chromeIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.0.0 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 15; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0',
};

describe('detectPrintBrowser', () => {
  it('Chrome, Edge et Chrome Android : moteur de référence', () => {
    for (const ua of [UA.chromeMac, UA.edgeWin, UA.chromeAndroid]) {
      expect(detectPrintBrowser(ua).id).toBe('chromium');
    }
  });

  it('reconnaît Safari et Firefox', () => {
    expect(detectPrintBrowser(UA.safariMac)).toEqual({ id: 'safari', name: 'Safari', ios: false, android: false });
    expect(detectPrintBrowser(UA.firefoxWin)).toEqual({ id: 'firefox', name: 'Firefox', ios: false, android: false });
  });

  it('sur iPhone / iPad, tout navigateur imprime comme Safari', () => {
    expect(detectPrintBrowser(UA.chromeIphone)).toEqual({ id: 'safari', name: 'Safari', ios: true, android: false });
    // iPad en mode « site pour ordinateur » : se présente comme un Mac tactile.
    expect(detectPrintBrowser(UA.safariMac, 5).ios).toBe(true);
  });

  it('Android : fenêtre d’impression du système, sans changer le moteur détecté', () => {
    expect(detectPrintBrowser(UA.chromeAndroid)).toEqual({ id: 'chromium', name: '', ios: false, android: true });
    expect(detectPrintBrowser(UA.firefoxAndroid)).toMatchObject({ id: 'firefox', android: true });
    for (const ua of [UA.chromeMac, UA.edgeWin, UA.safariMac, UA.firefoxWin, UA.chromeIphone]) {
      expect(detectPrintBrowser(ua).android).toBe(false);
    }
  });

  it('agent inconnu ou absent : pas d’avertissement', () => {
    expect(detectPrintBrowser('').id).toBe('chromium');
    expect(detectPrintBrowser(undefined).id).toBe('chromium');
  });
});
