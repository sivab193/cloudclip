#!/usr/bin/env node
/*
 * Post-build fixup for the static web export.
 *
 * expo-router's static renderer injects react-helmet's `<title data-rh="true">`
 * as the FIRST element of <head>, and leaves it empty. Per the HTML spec the
 * first <title> is the document title, so that empty tag beats the real one we
 * set in app/+html.tsx — the tab renders blank and non-JS crawlers (most link
 * unfurlers) see no title.
 *
 * Neither `<Stack screenOptions={{ title }}>` nor `<Head>` from
 * 'expo-router/head' populates it, so we strip the empty tag after export.
 * Only ever removes a title that is genuinely EMPTY, so a real helmet-managed
 * title on some future route would be left alone.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const EMPTY_HELMET_TITLE = /<title data-rh="true">\s*<\/title>/g;

function htmlFilesIn(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...htmlFilesIn(full));
        else if (entry.endsWith('.html')) out.push(full);
    }
    return out;
}

let patched = 0;
for (const file of htmlFilesIn(DIST)) {
    const html = readFileSync(file, 'utf8');
    const fixed = html.replace(EMPTY_HELMET_TITLE, '');
    if (fixed !== html) {
        writeFileSync(file, fixed);
        patched++;
    }
}

console.log(`fix-html-head: stripped empty helmet <title> from ${patched} file(s)`);
