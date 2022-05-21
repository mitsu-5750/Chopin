'use strict';

let score = { rank: null, board: 0, max_combo: 0, combo: 0, perfect: 0, good: 0, bad: 0, miss: 0 };
let notesData = null;
let music = new Howl({ 'src': [`songs/${getSong('n')}/item.mp3`] });
let audio = {
	'flick': new Howl({ 'src': ['bin/audio/flick.mp3'] }),
	'perfect': new Howl({ 'src': ['bin/audio/perfect.mp3'] }),
	'good': new Howl({ 'src': ['bin/audio/good.mp3'] }),
	'bad': new Howl({ 'src': ['bin/audio/bad.mp3'] }),
};
let notes = [[], [], [], [],];
let isFlick = false;
let bpm = null;
let beat = 0, bar = -1;
let gameStatus = 'stand';

const MAIN = document.getElementById('MAIN');
const LINES = document.querySelectorAll('.lines');
const EFFECTS = document.querySelectorAll('.effects');
const COMBO = document.getElementById('COMBO');


class Note {
	constructor(line, type = 1) {
		this.line = line;
		this.type = type;
		this.y = 110;
		this.el = null;

		this.show();
	}

	show() {
		this.el = document.createElement('img');

		if (this.type == 1)
			this.el.src = `bin/img/${DATA.type}.png`;

		if (this.type == 2)
			this.el.src = `bin/img/flick.png`;

		this.el.classList.add('notes');
		LINES[this.line].insertAdjacentElement('afterbegin', this.el);
	}

	fall() {
		this.y -= 1.8;
		this.el.style.left = `${this.y}%`;

		if (this.y < -10) {
			this.remove(this.lane);
			// viewJudgeEffect('miss');
			COMBO.innerHTML = 0;
		}
	}

	remove() {
		this.el.remove();
		notes[this.line].shift();
	}
}

/**
 * 初期化処理
 */
function init() {
	notesData = noteCompile();
	bpm = bpmCompile();
	operation();

	document.getElementById('BACK_JACKET').src = `songs/${getSong('n')}/jacket.jpg`;
}

/**
 * 演奏開始
 */
function musicStart() {
	gameStatus = 'start';
	if (DATA.preview && DATA.auto)
		preview();


	update();

	setTimeout(() => {
		music.currentTime = DATA.music_offset;
		music.play();
	}, DATA.play_offset);
}

/**
 * 1/60回実行されるゲームチック
 */
function update() {
	showNotes();

	if (DATA.auto) {
		auto();
		isFlick = true;
	}


	if (gameStatus == 'start')
		window.requestAnimationFrame(update);

	if (isFlick && !DATA.auto)
		window.requestAnimationFrame(() => isFlick = false);

}

/**
 * ノーツ生成
 */
function showNotes() {
	for (let lines of notes) for (let note of lines)
		note.fall();

	if (!(beat + DATA.offset < music.seek()))
		return;

	if (bar == notesData.length - 1)
		return;

	console.log(bar);

	beat = beat + bpm;
	bar++;
	for (let i = 0; i < notesData[bar].length; i++) {
		setTimeout(() => {

			for (let noteLane = 0; noteLane < notesData[bar][i].length; noteLane++) {
				let noteType = notesData[bar][i].substr(noteLane, 1);

				if (noteType == '0')
					continue;

				notes[noteLane].push(new Note(noteLane, noteType));
			}
		}, (bpm / notesData[bar].length) * (i * 1000))
	}
}

/**
 * タッチ操作マスター
 */
function operation() {
	document.addEventListener('touchstart', (event) => {
		event.preventDefault();

		if (gameStatus == 'stand') {
			musicStart();
			return;
		}

		if(DATA.auto)
			return;

		for (let p of event.changedTouches) {
			let pos = getPos(p);
			let mainHeight = MAIN.clientHeight / 4;

			if (pos['y'] > mainHeight * 0 && pos['y'] < mainHeight * 1) {
				judge(0);
				// TapEffect(0);
			}

			if (pos['y'] > mainHeight * 1 && pos['y'] < mainHeight * 2) {
				judge(1);
				// TapEffect(1);
			}

			if (pos['y'] > mainHeight * 2 && pos['y'] < mainHeight * 3) {
				judge(2);
				// TapEffect(2);
			}

			if (pos['y'] > mainHeight * 3 && pos['y'] < mainHeight * 4) {
				judge(3);
				// TapEffect(3);
			}
		}
	}, { passive: false });

	document.addEventListener('touchmove', (event) => {
		isFlick = true;
	});
}

/**
 * 判定
 */
function judge(line) {
	if (!notes[line][0])
		return;

	if (notes[line][0].y > -6 && notes[line][0].y < 6) {
		COMBO.innerHTML = 1 + Number(COMBO.innerHTML);
		return takeNote('perfect', line);
	}

	if (notes[line][0].y > -12 && notes[line][0].y < 12) {
		COMBO.innerHTML = 1 + Number(COMBO.innerHTML);
		return takeNote('good', line);
	}

	if (notes[line][0].y > -24 && notes[line][0].y < 24) {
		COMBO.innerHTML = 0;
		return takeNote('bad', line);
	}
}

/**
 * 判定後の処理
 */
function takeNote(judge, line) {
	if (notes[line][0].type == 1) {
		audio[judge].play();
		notes[line][0].remove();
		judgeEffect(line);
		return;
	}

	if (notes[line][0].type == 2) {
		let tick = 10;
		let flickJudge = () => {
			tick--;

			if (!isFlick && tick != 0)
				return window.requestAnimationFrame(flickJudge);

			if (tick == 0)
				return;

			audio['flick'].play();
			notes[line][0].remove();
			judgeEffect(line);
		}

		flickJudge();
	}
}

/**
 * 譜面をコンパイル
 */
function noteCompile() {
	try {
		let notesData = DATA.notes.replace(/^#.*/gm, '').replace(/\r|\n/g, '').split(';');
		for (let i = 0; notesData.length > i; i++) {
			notesData[i] = notesData[i].split(',');
		}

		return notesData;

	} catch (e) {
		alert(`楽曲データが見つかりませんでした\n選択画面に戻ります`);
		// location.href = 'index.html';
	}
}

/**
 * BPMを秒数にコンパイル
 */
function bpmCompile() {
	return 4 * 60 / DATA.bpm;
}

/**
 * タップエフェクト
 */
function TapEffect(line) {
	LINES[line].style.backgroundColor = 'rgba(255, 255, 255, 0.05)';

	setTimeout(() => {
		LINES[line].style.backgroundColor = null;
	}, 50)
}

function judgeEffect(line) {
	EFFECTS[line].classList.remove('noteEffect');
	window.requestAnimationFrame(() => EFFECTS[line].classList.add('noteEffect'));
}

/**
 * タッチされた要素内の座標を取得
 */
function getPos(pos) {
	let windowPos = MAIN.getBoundingClientRect();
	let x = windowPos.left + window.pageXOffset;
	let y = windowPos.top + window.pageYOffset;

	return { 'x': pos['pageX'] - x, 'y': pos['pageY'] - y };
}

/**
 * オート
 */
function auto() {
	for (let i = 0; i < notes.length; i++) {

		if (!notes[i][0])
			continue;

		if (notes[i][0].y < 0)
			takeNote('perfect', i);
	}
}

function preview() {
	music.seek(DATA.preview * bpm);
	bar = DATA.preview - 1;
	beat = DATA.preview * bpm;
}

window.addEventListener('load', init);