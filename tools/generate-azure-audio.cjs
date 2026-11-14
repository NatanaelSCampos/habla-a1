/* Geração privada de MP3. A chave nunca participa do catálogo ou dos arquivos do site. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {parseEnv} = require('node:util');
const {canonical} = require('./collect-audio-sources.cjs');
const ROOT = path.resolve(__dirname, '..');
const FORMAT = 'audio-24khz-48kbitrate-mono-mp3';
const DEFAULT_VOICE = 'es-MX-DaliaNeural';
const LOCALE = 'es-MX';
const PROFILE_VERSION = 1;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function configuration(env = process.env, file = path.join(ROOT, '.env')) {
  const local = fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) : {};
  const values = {...local, ...env};
  const key = values.AZURE_SPEECH_KEY;
  if (!key) throw Error('Configure AZURE_SPEECH_KEY no .env ou no ambiente.');
  let endpoint;
  try {
    endpoint = new URL(values.AZURE_SPEECH_ENDPOINT || `https://${values.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/`);
  } catch { throw Error('Configure um endpoint ou uma região do Azure Speech.'); }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port || endpoint.search || endpoint.hash) {
    throw Error('Endpoint do Speech deve ser HTTPS, sem credenciais ou parâmetros.');
  }
  const regional = endpoint.hostname.match(/^([a-z0-9]+)\.api\.cognitive\.microsoft\.com$/);
  if (regional) endpoint = new URL(`https://${regional[1]}.tts.speech.microsoft.com/`);
  const isRegional = /^[a-z0-9]+\.tts\.speech\.microsoft\.com$/.test(endpoint.hostname);
  const isResource = /^[a-z0-9-]+\.cognitiveservices\.azure\.com$/.test(endpoint.hostname);
  if (!isRegional && !isResource) throw Error('Endpoint fora dos domínios oficiais do Azure Speech.');
  return {key, endpoint: endpoint.origin + (isResource ? '/tts' : '') + '/cognitiveservices/'};
}
function profile(voice = DEFAULT_VOICE) {
  if (!['es-MX-DaliaNeural', 'es-MX-JorgeNeural'].includes(voice)) throw Error('Escolha uma das vozes mexicanas configuradas.');
  return {provider: 'azure-speech', voice, language: LOCALE, format: FORMAT, rate: '0%', version: PROFILE_VERSION};
}
function clipPath(text, settings) {
  const hash = crypto.createHash('sha256').update(JSON.stringify(settings) + '\n' + canonical(text)).digest('hex').slice(0, 24);
  return `clips/azure-${settings.voice.toLowerCase()}-v${settings.version}-${hash}.mp3`;
}
const xml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[c]));
function encoderCommand() {
  const installed = require('ffmpeg-static');
  return process.env.FFMPEG_PATH || (installed && fs.existsSync(installed) ? installed : 'ffmpeg');
}
function ssml(text, settings) {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${LOCALE}"><voice name="${xml(settings.voice)}"><prosody rate="${settings.rate}">${xml(canonical(text))}</prosody></voice></speak>`;
}
function validMp3(bytes) {
  if (bytes.length < 500) return false;
  // 24 kHz, MPEG-2 Layer III. Exige quadros de áudio além de eventual tag ID3.
  let offset = 0;
  if (bytes.subarray(0, 3).toString() === 'ID3') offset = 10 + ((bytes[6]&127)*2097152 + (bytes[7]&127)*16384 + (bytes[8]&127)*128 + (bytes[9]&127));
  for (let i = offset; i < Math.min(bytes.length - 3, offset + 2048); i++) {
    if (bytes[i] === 255 && (bytes[i+1] & 254) === 242 && (bytes[i+2] & 12) === 4 && (bytes[i+2] >> 4) > 0 && (bytes[i+2] >> 4) < 15) return true;
  }
  return false;
}
function validFile(file) {return fs.existsSync(file) && validMp3(fs.readFileSync(file));}
function atomicJson(file, value) {
  fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(file + '.tmp', file);
}
class AzureError extends Error {
  constructor(status) {super(`Azure Speech retornou HTTP ${status}.`); this.status = status;}
}
async function request(config, suffix, init = {}, fetcher = fetch) {
  return fetcher(config.endpoint + suffix, {...init, redirect: 'error', signal: AbortSignal.timeout(45000), headers: {
    'Ocp-Apim-Subscription-Key': config.key, 'User-Agent': 'HablaA1-AudioGenerator', ...init.headers
  }});
}
async function verifyVoice(config, settings, fetcher = fetch) {
  const response = await request(config, 'voices/list', {}, fetcher);
  if (!response.ok) throw new AzureError(response.status);
  const voices = await response.json();
  if (!voices.some(v => v.ShortName === settings.voice && v.Locale === LOCALE && v.Status === 'GA')) {
    throw Error('A voz mexicana escolhida não está disponível neste recurso.');
  }
}
async function synthesize(config, text, settings, fetcher = fetch) {
  const response = await request(config, 'v1', {method: 'POST', headers: {
    'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': FORMAT
  }, body: ssml(text, settings)}, fetcher);
  if (!response.ok) {
    const error = new AzureError(response.status);
    const retry = response.headers.get('retry-after');
    error.retryMs = /^\d+$/.test(retry || '') ? Number(retry)*1000 : Math.max(0, Date.parse(retry) - Date.now()) || 0;
    await response.body?.cancel();
    throw error;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!validMp3(bytes)) throw Error('Resposta do Speech não contém MP3 válido de 24 kHz.');
  return bytes;
}
function batchSsml(texts, settings) {
  const body = texts.map((text, i) => `<bookmark mark="s${i}"/><p>${xml(canonical(text))}</p><break time="120ms"/><bookmark mark="e${i}"/><break time="120ms"/>`).join('');
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${LOCALE}"><voice name="${xml(settings.voice)}"><prosody rate="${settings.rate}">${body}</prosody></voice></speak>`;
}
function rangesFor(texts, marks, sampleCount) {
  // O serviço pode omitir o bookmark após a última frase. O próximo início
  // delimita cada fala; a última termina no fim do PCM concluído pelo serviço.
  const ranges = texts.map((_, i) => ({start: Math.round(marks.get(`s${i}`) * 24000), end: i + 1 < texts.length ? Math.round(marks.get(`s${i+1}`) * 24000) : sampleCount}));
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (!Number.isSafeInteger(r.start) || !Number.isSafeInteger(r.end) || r.start < 0 || r.end <= r.start || r.end > sampleCount || (i && r.start < ranges[i-1].end)) {
      const error = Error('Marcadores de áudio incompletos ou fora de ordem; lote preservado sem ativar.');
      error.ranges = ranges; error.sampleCount = sampleCount; error.marks = [...marks]; throw error;
    }
  }
  return ranges;
}
async function synthesizeBatch(config, texts, settings) {
  const sdk = require('microsoft-cognitiveservices-speech-sdk');
  const endpoint = new URL('/tts/cognitiveservices/websocket/v1', config.endpoint); endpoint.protocol = 'wss:';
  const speech = sdk.SpeechConfig.fromEndpoint(endpoint, config.key);
  speech.speechSynthesisVoiceName = settings.voice;
  speech.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Raw24Khz16BitMonoPcm;
  const synthesizer = new sdk.SpeechSynthesizer(speech, null);
  const marks = new Map();
  synthesizer.bookmarkReached = (_, event) => marks.set(event.text, event.audioOffset / 10000000);
  let timer;
  try {
    const result = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(Error('Prazo da síntese excedido.')), 300000);
      synthesizer.speakSsmlAsync(batchSsml(texts, settings), resolve, () => reject(Error('Falha na conexão do Speech SDK.')));
    });
    if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
      const details = sdk.CancellationDetails.fromResult(result);
      const status = details.ErrorCode === sdk.CancellationErrorCode.TooManyRequests ? 429
        : details.ErrorCode === sdk.CancellationErrorCode.AuthenticationFailure ? 401
        : details.ErrorCode === sdk.CancellationErrorCode.BadRequestParameters ? 400
        : details.ErrorCode === sdk.CancellationErrorCode.Forbidden ? 403 : 503;
      const error = new AzureError(status); error.sdkCode = sdk.CancellationErrorCode[details.ErrorCode];
      throw error;
    }
    const pcm = Buffer.from(result.audioData);
    const ranges = rangesFor(texts, marks, pcm.length / 2);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'habla-tts-'));
    try {
      // Corta PCM pelos offsets antes da codificação: nenhum corte depende de estimativa de palavras.
      const outputs = texts.map((_, i) => path.join(directory, `${i}.mp3`));
      const args = ['-hide_banner','-loglevel','error','-y'];
      for (let i = 0; i < ranges.length; i++) {
        const raw = path.join(directory, `${i}.pcm`);
        fs.writeFileSync(raw, pcm.subarray(ranges[i].start * 2, ranges[i].end * 2));
        args.push('-f','s16le','-ar','24000','-ac','1','-i',raw);
      }
      for (let i = 0; i < outputs.length; i++) args.push('-map',`${i}:a`,'-c:a','libmp3lame','-b:a','48k','-ar','24000','-ac','1',outputs[i]);
      try {await promisify(execFile)(encoderCommand(), args, {windowsHide:true, timeout:120000, maxBuffer:1024*1024});}
      catch {const error = Error('Falha na codificação local do lote; verifique o FFmpeg.'); error.nonRetryable = true; throw error;}
      const clips = outputs.map(file => fs.readFileSync(file));
      if (clips.some(bytes => !validMp3(bytes))) throw Error('MP3 inválido após a separação do lote.');
      return clips;
    } finally {fs.rmSync(directory, {recursive:true, force:true});}
  } finally {clearTimeout(timer); synthesizer.close(); speech.close();}
}
function readSources(root) {
  const sources = JSON.parse(fs.readFileSync(path.join(root, 'audio/sources.json'), 'utf8'));
  if (!Array.isArray(sources.phrases) || sources.phrases.some(t => typeof t !== 'string' || !canonical(t))) throw Error('Seleção de áudio inválida.');
  return [...new Set(sources.phrases.map(canonical))];
}
async function generate({root = ROOT, config, settings = profile(), maxNew = Infinity, concurrency = 4, intervalMs = 250, batchSize = 1, fetcher = fetch, batcher = synthesizeBatch, log = console.log, wait = sleep} = {}) {
  const texts = readSources(root);
  const pendingFile = path.join(root, 'audio/azure-index.pending.json');
  const index = {version: 2, provider: 'azure-speech', voice: settings.voice, language: LOCALE, generation: settings,
    disclosure: 'Voz sintetizada por inteligência artificial', clips: {}};
  const pending = [];
  for (const text of texts) {
    const relative = clipPath(text, settings);
    if (validFile(path.join(root, 'audio', relative))) index.clips[text] = relative;
    else pending.push(text);
  }
  log(`Seleção: ${texts.length} | recuperados: ${Object.keys(index.clips).length} | pendentes: ${pending.length} | voz: ${settings.voice}`);
  atomicJson(pendingFile, index);
  if (!pending.length || !maxNew) return {index, complete: !pending.length, generated: 0};
  if (batchSize > 1 && batcher === synthesizeBatch) {
    try {await promisify(execFile)(encoderCommand(), ['-version'], {windowsHide:true, timeout:10000});}
    catch {throw Error('Prepare o FFmpeg antes de gerar áudio. Nenhuma síntese foi solicitada.');}
  }
  await verifyVoice(config, settings, fetcher);
  fs.mkdirSync(path.join(root, 'audio/clips'), {recursive: true});
  let generated = 0, failed = 0, cursor = 0, fatal = null, nextStart = 0, blockedUntil = 0;
  const work = pending.slice(0, maxNew);
  const batches = [];
  for (let i = 0; i < work.length; i += batchSize) batches.push(work.slice(i, i + batchSize));
  const pace = async () => {
    const start = Math.max(Date.now(), nextStart, blockedUntil);
    nextStart = start + intervalMs;
    if (start > Date.now()) await wait(start - Date.now());
  };
  await Promise.all(Array.from({length: Math.min(concurrency, batches.length)}, async () => {
    while (!fatal && cursor < batches.length) {
      const batch = batches[cursor++];
      try {
        for (let attempt = 0; ; attempt++) {
          await pace();
          if (fatal) return;
          try {
            const outputs = batchSize > 1 ? await batcher(config, batch, settings) : [await synthesize(config, batch[0], settings, fetcher)];
            if (outputs.length !== batch.length || outputs.some(bytes=>!validMp3(bytes))) throw Error('Lote não corresponde às frases solicitadas.');
            for (let i = 0; i < batch.length; i++) {
              const relative = clipPath(batch[i], settings), target = path.join(root, 'audio', relative);
              fs.writeFileSync(target + '.tmp.mp3', outputs[i]);
              fs.renameSync(target + '.tmp.mp3', target);
              index.clips[batch[i]] = relative;
              generated++;
            }
            atomicJson(pendingFile, index);
            log(`Gerados: ${generated}/${work.length} | catálogo: ${Object.keys(index.clips).length}/${texts.length}`);
            break;
          } catch (error) {
            log(`Nova tentativa de síntese (${attempt + 1}): ${error.sdkCode || (error.status ? 'HTTP ' + error.status : 'falha de síntese ou codificação')}`);
            if ([401,403,400,404].includes(error.status)) {fatal = error; throw error;}
            if (error.nonRetryable) {fatal = error; throw error;}
            if (attempt >= 5) throw error;
            if (error.status === 429) {
              intervalMs = Math.max(intervalMs, 3100);
              blockedUntil = Date.now() + Math.max(60000, error.retryMs || 0);
              log('Limite do Speech atingido; aguardando e reduzindo o ritmo.');
            } else {
              blockedUntil = Date.now() + Math.max(1000 * 2 ** attempt, error.retryMs || 0);
            }
          }
        }
      } catch (error) {
        failed += batch.length;
        for (const text of batch) fs.rmSync(path.join(root, 'audio', clipPath(text, settings)) + '.tmp.mp3', {force: true});
        // Não imprime corpo de resposta, endpoint, cabeçalhos nem chave.
        log(`Falha no lote de ${batch.length} frases: ${error.status ? 'HTTP ' + error.status : 'síntese ou gravação indisponível'}`);
      }
    }
  }));
  index.clips = Object.fromEntries(texts.filter(t => index.clips[t]).map(t => [t, index.clips[t]]));
  atomicJson(pendingFile, index);
  if (fatal) throw fatal;
  if (failed) throw Error(`${failed} frases falharam. O catálogo ativo foi preservado; execute novamente para retomar.`);
  const complete = Object.keys(index.clips).length === texts.length;
  log(`Finalizado: ${generated} novos | catálogo: ${Object.keys(index.clips).length}/${texts.length} | completo: ${complete}`);
  return {index, complete, generated};
}
function activate(root = ROOT, settings = profile()) {
  const file = path.join(root, 'audio/azure-index.pending.json');
  const index = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (JSON.stringify(index.generation) !== JSON.stringify(settings)) throw Error('O perfil do catálogo não corresponde à voz escolhida.');
  const texts = readSources(root);
  if (Object.keys(index.clips).length !== texts.length || texts.some(t => index.clips[t] !== clipPath(t, settings) || !validFile(path.join(root, 'audio', index.clips[t])))) {
    throw Error('Catálogo incompleto ou MP3 inválido. O catálogo ativo foi preservado.');
  }
  atomicJson(path.join(root, 'audio/index.json'), index);
  return index;
}
async function main(args = process.argv.slice(2)) {
  const {parseArgs} = require('node:util');
  const {values} = parseArgs({args, options: {
    'voice': {type:'string', default:DEFAULT_VOICE}, 'max-new': {type:'string'},
    'concurrency': {type:'string', default:'1'}, 'interval-ms': {type:'string', default:'3200'},
    'batch-size': {type:'string', default:'48'},
    'activate': {type:'boolean'}, 'dry-run': {type:'boolean'}
  }});
  const settings = profile(values.voice);
  if (values.activate) {const index = activate(ROOT, settings); console.log(`Catálogo Azure ativado: ${Object.keys(index.clips).length} MP3.`); return;}
  if (values['dry-run']) {
    const texts = readSources(ROOT);
    console.log(JSON.stringify({voice: settings.voice, phrases: texts.length, characters: texts.reduce((n,t)=>n+[...t].length,0), missing: texts.filter(t=>!validFile(path.join(ROOT,'audio',clipPath(t,settings)))).length})); return;
  }
  const maxNew = values['max-new'] === undefined ? Infinity : Number(values['max-new']);
  const concurrency = Number(values.concurrency), intervalMs = Number(values['interval-ms']);
  const batchSize = Number(values['batch-size']);
  if ((!Number.isInteger(maxNew) && maxNew !== Infinity) || maxNew < 0 || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8 || !Number.isFinite(intervalMs) || intervalMs < 100 || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 64) throw Error('Limites de geração inválidos.');
  await generate({config: configuration(), settings, maxNew, concurrency, intervalMs, batchSize});
}
if (require.main === module) main().catch(error => {console.error(error instanceof AzureError ? error.message : (error.code ? 'Falha local: ' + error.code : error.message)); process.exitCode = 1;});
module.exports = {configuration, profile, clipPath, ssml, batchSsml, rangesFor, validMp3, synthesize, synthesizeBatch, verifyVoice, generate, activate, main};
