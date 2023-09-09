'use strict';

import { shuffle } from "./function_storage.js";

const docArea = document.getElementById('document-area');
const innerBank = document.getElementById('inner-bank');
const figAmount = document.getElementById('figures-amount');
const assorty = document.getElementById('assorted-figures');
const refresh = document.getElementById('refresh-button');
const soundSwitcher = document.getElementById('sound-switcher');
const SPEED_MEASURE_INTERVAL = 50; 
const TIME_THROW = 300;
const ACTION_TIME_AFTER_STOPPING = 250;
const whoaSounds = [
    'sounds/Whooaaaaa-1.mp3',
    'sounds/Whooaaaaa-2.mp3',
    'sounds/Whooaaaaa-3.mp3'
];
const INNER_BANK_MESSAGE = 'Put in!';
const PUT_MESSAGE = 'Whoooaaaaaa!';
const timers = {}; // Ключи объекта = названия фигур, являющиеся объектами для собственных таймеров
let speedMeasureTimer1 = null; // Интервальный таймер измерения скорости во время захвата фигуры (останавливается при отпускании)
let speedMeasureTimer2 = null; // Серия таймеров измерения скорости во время броска фигуры (останавливается при обновлении)
let backgroundChangeTimer = null;
let putTimer = null;
let clearMessageTimer = null;
let isPutting = false;
let isThrowing = false;
let muteAudio = null;
let muteSpeaker = false;
let currentAudio;
let k; // Подсчёт элементов

refresh.onclick = refreshFigures;
soundSwitcher.onclick = switchSound;
innerBank.onpointerdown = activateInnerBank;

refreshFigures();

function refreshFigures() {
    k = 0;
    createFigures();
    arrangeFigures();
}

function activateInnerBank(event) {
    if (event.button != 0) return;
    if (!event.isPrimary) return;

    if (event.pointerType != 'mouse') innerBank.classList.remove('hover-on');

    if (!isPutting && !isThrowing) {
        innerBank.innerHTML = INNER_BANK_MESSAGE;
        //innerBank.onpointerenter = () => innerBank.innerHTML = INNER_BANK_MESSAGE;
        //innerBank.onpointerleave = () => innerBank.innerHTML = '';
        document.onpointerup = deactivateInnerBank;
        innerBank.onpointerdown = null;
    }

    function deactivateInnerBank(event) {
        if (!event.isPrimary) return;

        innerBank.innerHTML = '';
        //innerBank.onpointerenter = null;
        //innerBank.onpointerleave = null;
        document.onpointerup = null;
        innerBank.onpointerdown = activateInnerBank;
    }
}

function switchSound(event) {
    if (event.pointerType != 'mouse') soundSwitcher.classList.remove('hover-on');

    const speaker = this.querySelector('img');

    if (muteSpeaker) {
        this.style.backgroundColor = '#5bdfb3';
        speaker.src = 'images/speaker.png';
        muteSpeaker = false;
    } else {this.style.backgroundColor = '#f14646';
        speaker.src = 'images/speaker_mute.png';
        currentAudio.muted = true;
        muteSpeaker = true;
    }
}

function playSound(audioSource) {
    if (!muteSpeaker) {
        if (muteAudio) setTimeout(() => {
            muteAudio.pause();
            muteAudio = null;
        }, 50);

        let audio = new Audio(audioSource);
        audio.preload = true;
        audio.play();

        return audio;
    }
}

function createFigures() {
    const figNames = ['square', 'triangle', 'circle', 'rectangle', 'ellipse', 'rhombus'];
    const colors = {
        yellow: '#fbff00',
        green: '#9aff57',
        pink: '#ff70cf',
        blue: '#7489ff',
        brown: '#ffb03b',
        skyblue: '#7affff'
    };

    for (let figure in timers) {
        for (let timer of Object.keys(timers[figure])) {
            clearTimeout(timers[figure][timer]);
        }
        delete timers[figure];
    }

    assorty.innerHTML = '';

    const colNames = [];
    for (let key in colors) {
        colNames.push(key);
    }
    shuffle(colNames);
    shuffle(figNames);

    if (+figAmount.value < +figAmount.min) figAmount.value = figAmount.min;
    if (+figAmount.value > +figAmount.max) figAmount.value = figAmount.max;
    const n = +figAmount.value;

    for (let i = 0; i < n; i++) {
        const figWrap = document.createElement('div');
        figWrap.className = 'figure-wrap';
        assorty.append(figWrap);

        const fig = document.createElement('div');
        fig.id = figNames[i];
        fig.className = 'figure';
        fig.insertAdjacentHTML('afterbegin', '<p><b>Move and put!</b></p>');
        fig.insertAdjacentHTML('beforeend', '<p class="figure-info">(Not moved)</p>');
        assorty.append(fig);

        // Новый стайл-документ для применения рандомного цвета к псевдоэлементам
        const colorStyle = document.createElement('style');
        colorStyle.innerHTML = `#${fig.id}::after {
            background-color: ${colors[colNames[i]]};
        }`;
        document.querySelector('head').append(colorStyle);
    }
}

function arrangeFigures() {
    for (let figure in timers) {
        delete timers[figure];
    }

    const figureWraps = assorty.querySelectorAll('.figure-wrap');
    const figures = assorty.querySelectorAll('.figure');
    let putPermission = false;
    let lastGrabbing = null;
    let lastPuttedBeforePause = null;
    let lastWhoaIndex = null;
    let puttingBGColor;

    if (innerBank.style.backgroundColor) innerBank.style.backgroundColor = '';
    innerBank.innerHTML = '';
    innerBank.onpointerdown = activateInnerBank;

    isPutting = false;

    currentAudio = playSound('sounds/Start.mp3');

    for (let figure of figures) {
        k++;
        figure.hidden = false;
        figure.style.cursor = '';
        const figureInfo = figure.querySelector('.figure-info');
        figureInfo.innerHTML = '(Not moved)';
        if (figure.classList.contains('put-in')) figure.classList.remove('put-in');
        timers[figure.id] = {};

        figureWraps[k - 1].style.height = getComputedStyle(figure).height;
        figureWraps[k - 1].style.width = getComputedStyle(figure).width;
        figure.style.left = '';
        figure.style.top = '';
        figure.style.bottom = '';
        figure.style.right = '';
        figureWraps[k - 1].append(figure);

        figure.ontouchstart = () => false;
        figure.ondragstart = () => false;
        figure.onpointerdown = dragAndDrop;
    }

    function dragAndDrop(event) {
        if (event.button != 0) return;
        if (!event.isPrimary) return;

        const docHeight = Math.max(
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight,
            document.body.clientHeight, document.documentElement.clientHeight
        );
        const docWidth = Math.max(
            document.body.scrollWidth, document.documentElement.scrollWidth,
            document.body.offsetWidth, document.documentElement.offsetWidth,
            document.body.clientWidth, document.documentElement.clientWidth
        );
        const figure = event.target.closest('.figure');
        if (figure.classList.contains('put-in')) return;
        const figureInfo = figure.querySelector('.figure-info');
        let innerBankRect = getRect(innerBank);
        let figureRect = getRect(figure);
        let figX1 = figureRect.left;
        let figY1 = figureRect.top;
        let figX2 = figX1;
        let figY2 = figY1;
        const figureShiftX = event.pageX - figX1;
        const figureShiftY = event.pageY - figY1;
        let x1, y1, x2, y2, t1, t2, tDelta, distance, speed, figXDelta, figYDelta;
        let prevScrollX = window.pageXOffset;
        let prevScrollY = window.pageYOffset;

        putPermission = false;
        lastGrabbing = figure;

        for (let fig in timers) {
            if (fig == figure.id) {
                for (let timer of Object.keys(timers[fig])) {
                    if (timer != 'putTimer') {
                        clearTimeout(timers[fig][timer]);
                        delete timers[fig][timer];
                    }
                }
            } else {
                if ('clearMessageTimer' in timers[fig]) {
                    clearTimeout(timers[fig]['clearMessageTimer']);
                    delete timers[fig]['clearMessageTimer'];
                }
            }
        }
    
        figure.style.zIndex = 10;
        figure.style.filter = 'brightness(90%)';
        figure.style.cursor = 'grabbing';
        assorty.append(figure);

        t1 = t2 = Date.now();
        x1 = x2 = event.pageX;
        y1 = y2 = event.pageY;
        figureInfo.innerHTML = x2.toFixed(0) + ':' + y2.toFixed(0);
        moveAt(x1, y1);
        detectLocation(x1, y1);

        innerBank.innerHTML = this.id[0].toUpperCase() + this.id.slice(1);
        innerBank.innerHTML += '<br>(Speed = 0.00 px/ms)';
        
        figure.setPointerCapture(event.pointerId); // Перенацелить все события указателя (до pointerup) на figure
        figure.addEventListener('pointermove', moveFigure, {passive: false});
        document.addEventListener('scroll', moveFigureOnScroll);
        docArea.addEventListener('wheel', preventZoomOnWheel); // Запрет зума для Control + Wheel (работает только на элементе)
        document.addEventListener('keydown', preventZoomOnKeys); // Запрет зума для Control + '-'/'+'
        innerBank.onpointerdown = null;
        docArea.onpointerup = leaveFigure;
        figure.onpointerdown = null;

        console.log(`-----${figure.id} | Start moving-----`);

        calcSpeed = calcSpeed.bind(this); // this = figure в функции calcSpeed

        speedMeasureTimer1 = setInterval(() => {
            console.log(`${figure.id} | Pointer coords: (${x1}, ${y1}) => (${x2}, ${y2})`);

            innerBank.innerHTML = figure.id[0].toUpperCase() + figure.id.slice(1);
            
            if ((x1 != x2) || (y1 != y2)) { // Если указатель мыши двигается
                if ((figX1 != figX2) || (figY1 != figY2)) { // Если фигура двигается
                    calcSpeed();
                    innerBank.innerHTML += '<br>(Speed = ' + speed.toFixed(2) + ' px/ms)';
                } else {
                    t1 = Date.now();
                    innerBank.innerHTML += '<br>(Speed = 0.00 px/ms)';
                }
            }
            else { // Если никакого движения нет
                //detectLocation(x2, y2);
                t1 = Date.now();
                innerBank.innerHTML += '<br>(Speed = 0.00 px/ms)';
            }
        }, SPEED_MEASURE_INTERVAL);
        timers[figure.id]['speedMeasureTimer1'] = speedMeasureTimer1;

        function moveAt(pageX, pageY) {
            let x = pageX - figureShiftX;
            if (x < 0) x = 0;
            if (x > docWidth - figure.offsetWidth) x = docWidth - figure.offsetWidth;
            x = x * 100 / docWidth;
            figure.style.left = `calc(${x}%)`;
    
            let y = pageY - figureShiftY;
            if (y < 0) y = 0;
            if (y > docHeight - figure.offsetHeight) y = docHeight - figure.offsetHeight;
            y = y * 100 / docHeight;
            figure.style.top = `calc(${y}%)`;
        }
        
        function moveFigure(event) {
            if (!event.isPrimary) return;

            x2 = event.pageX;
            y2 = event.pageY;
            figureInfo.innerHTML = x2.toFixed(0) + ':' + y2.toFixed(0);
            moveAt(x2, y2);
            detectLocation(x2, y2);

            figureRect = getRect(figure);
            figX2 = figureRect.left;
            figY2 = figureRect.top;
        }
    
        function leaveFigure(event) {
            if (!event.isPrimary) return;

            clearInterval(speedMeasureTimer1);

            figure.removeEventListener('pointermove', moveFigure, {passive: false});
            document.removeEventListener('scroll', moveFigureOnScroll);
            docArea.removeEventListener('wheel', preventZoomOnWheel);
            document.removeEventListener('keydown', preventZoomOnKeys);
            innerBank.onpointerdown = activateInnerBank;
            docArea.onpointerup = null;
            figure.onpointerdown = dragAndDrop;

            figure.style.filter = '';
            figure.style.cursor = 'grab';

            x2 = event.pageX;
            y2 = event.pageY;

            console.log(`${figure.id} | Pointer coords: (${x1}, ${y1}) => (${x2}, ${y2})`);

            calcSpeed();

            if (!speed) {
                if (putPermission) {
                    puttingFigure();
                    return;
                }

                figureInfo.innerHTML = '(Stopped)';

                clearMessageTimer = setTimeout(clearInnerBankMessage, ACTION_TIME_AFTER_STOPPING);
                timers[figure.id]['clearMessageTimer'] = clearMessageTimer;
            } else {
                figureInfo.innerHTML = '(Thrown)';
                innerBank.innerHTML = figure.id[0].toUpperCase() + figure.id.slice(1);
                innerBank.innerHTML += '<br>(Speed = ' + speed.toFixed(2) + ' px/ms)';

                throwFigure();
            }
        }

        function throwFigure() {
            isThrowing = true;

            figure.style.transition = `${TIME_THROW}ms cubic-bezier(.3,.5,.5,1)`;

            if (putPermission) innerBank.style.backgroundColor = '';

            console.log(`-----${figure.id} | Throwing-----`);

            const ratio = TIME_THROW / tDelta / 4; // Коэффициент при замедлении
            const figXThrow = figXDelta * ratio; // Всё расстояние по x, которое нужно пройти во время замедления
            const figYThrow = figYDelta * ratio; // Всё расстояние по y, которое нужно пройти во время замедления

            let [x, y] = calcThrowEndPoint(figXThrow, figYThrow);

            //console.log(x, y);

            x = x * 100 / docWidth;
            figure.style.left = `calc(${x}%)`;

            y = y * 100 / docHeight;
            figure.style.top = `calc(${y}%)`;

            let timeLeft = TIME_THROW;

            speedMeasureTimer2 = setTimeout(function measeringSpeedAfterThrow() {
                isThrowing = true;
                
                figureRect = getRect(figure);
                figX2 = figureRect.left;
                figY2 = figureRect.top;

                console.log(`${figure.id} | Figure coords: ` +
                    `(${figX1.toFixed(0)}, ${figY1.toFixed(0)}) => (${figX2.toFixed(0)}, ${figY2.toFixed(0)})`);

                calcSpeed();

                if (lastGrabbing == figure) { // Показывать инфо, если не захвачена другая фигура
                    innerBank.innerHTML = figure.id[0].toUpperCase() + figure.id.slice(1);
                    innerBank.innerHTML += '<br>(Speed = ' + speed.toFixed(2) + ' px/ms)';
                }

                timeLeft -= tDelta;

                if (timeLeft < SPEED_MEASURE_INTERVAL) {
                    speedMeasureTimer2 = setTimeout(() => {
                        isThrowing = false;

                        figure.style.transition = '';

                        figureRect = getRect(figure);
                        figX2 = figureRect.left;
                        figY2 = figureRect.top;
                        
                        const figCenterX = figX2 + figure.offsetWidth / 2;
                        const figCenterY = figY2 + figure.offsetHeight / 2;
                        detectLocation(figCenterX, figCenterY);

                        console.log(`-----${figure.id} | Stop moving-----`);
                        console.log(`${figure.id} | Figure coords: ` +
                            `(${figX1.toFixed(0)}, ${figY1.toFixed(0)}) => (${figX2.toFixed(0)}, ${figY2.toFixed(0)})`);

                        calcSpeed();

                        if (lastGrabbing == figure) { // Показывать инфо, если не захвачена другая фигура
                            innerBank.innerHTML = figure.id[0].toUpperCase() + figure.id.slice(1);
                            innerBank.innerHTML += '<br>(Speed = ' + speed.toFixed(2) + ' px/ms)';
                        }

                        if (putPermission) puttingFigure()
                        else {
                            figureInfo.innerHTML = '(Stopped)';

                            clearMessageTimer = setTimeout(clearInnerBankMessage, ACTION_TIME_AFTER_STOPPING);
                            timers[figure.id]['clearMessageTimer'] = clearMessageTimer;
                        }
                    }, timeLeft);
                    timers[figure.id]['speedMeasureTimer2'] = speedMeasureTimer2;
                } else {
                    speedMeasureTimer2 = setTimeout(measeringSpeedAfterThrow, SPEED_MEASURE_INTERVAL);
                    timers[figure.id]['speedMeasureTimer2'] = speedMeasureTimer2;
                }
            }, SPEED_MEASURE_INTERVAL);
            timers[figure.id]['speedMeasureTimer2'] = speedMeasureTimer2;
        }

        function clearInnerBankMessage() {
            if (isPutting) innerBank.innerHTML = PUT_MESSAGE
            else if (lastGrabbing == figure) innerBank.innerHTML = '';
        }

        function calcThrowEndPoint(figXThrow, figYThrow) {            
            figureRect = getRect(figure);
            figX2 = figureRect.left;
            figY2 = figureRect.top;

            let x = figXThrow + figX2;
            let y = figYThrow + figY2;
            //let segment, xRatio, yRatio;

            if (x < 0) {
                x = 0;
                //segment = figX2;
                //xRatio = Math.abs((segment * 100) / figXThrow);
                //y = figYThrow * ratio /100  + figY2;
                //return [x, y];
            }
            if (x > docWidth - figure.offsetWidth) {
                x = docWidth - figure.offsetWidth;
                //segment = (docWidth - figure.offsetWidth) - figX2;
                //xRatio = Math.abs((segment * 100) / figXThrow);
                //y = figYThrow * ratio / 100  + figY2;
                //return [x, y];
            }
            if (y < 0) {
                y = 0;
                //segment = figY2;
                //yRatio = Math.abs((segment * 100) / figYThrow);
                //x = figXThrow * ratio /100  + figX2;
                //return [x, y];
            }
            if (y > docHeight - figure.offsetHeight) {
                y = docHeight - figure.offsetHeight;
                //segment = (docHeight - figure.offsetHeight) - figY2;
                //yRatio = Math.abs((segment * 100) / figYThrow);
                //x = figXThrow * ratio / 100  + figX2;
                //return [x, y];
            }

            return [x, y];
        }

        function puttingFigure() {
            console.log(`-----${figure.id} | Putting-----`);

            // Аудиоблок Whooaaaaa
            let indexes = [0, 1, 2];
            if (lastWhoaIndex != null) indexes.splice(lastWhoaIndex, 1);
            shuffle(indexes);
            currentAudio = playSound(whoaSounds[indexes[0]]);
            lastWhoaIndex = indexes[0];

            innerBankRect = getRect(innerBank);
            const x = innerBankRect.left + innerBankRect.width / 2 - figure.offsetWidth / 2;
            const y = innerBankRect.top + innerBankRect.height / 2 - figure.offsetHeight / 2;
            figure.style.left = x + 'px';
            figure.style.top = y + 'px';

            innerBank.style.backgroundColor = puttingBGColor = '#49ff8f'; // Зелёный
            backgroundChangeTimer = setTimeout(() => {
                if (!putPermission) {
                    innerBank.style.backgroundColor = '#d1eaff'; // Светло-синий
                    puttingBGColor = '#d1eaff'; // Светло-синий
                }
                else puttingBGColor = '#d1eaff'; // Светло-синий
            }, ACTION_TIME_AFTER_STOPPING);
            timers[figure.id]['backgroundChangeTimer'] = backgroundChangeTimer;

            innerBank.innerHTML = PUT_MESSAGE;
            isPutting = true;
            figureInfo.innerHTML = '(Putted)';
            figure.style.zIndex = '';
            figure.style.cursor = 'cell';
            figure.classList.add('put-in');
            lastPuttedBeforePause = figure;
            putPermission = false;

            const transitionTime = parseFloat(getComputedStyle(assorty.querySelector('.put-in'))
                .transitionDuration) * 1000;

            putTimer = setTimeout(() => {
                figure.hidden = true;
                k--;

                console.log(`-----${figure.id} | Hidden-----`);

                if (lastPuttedBeforePause == figure) {
                    if (!putPermission) innerBank.style.backgroundColor = '';
                    if (innerBank.innerHTML == PUT_MESSAGE) innerBank.innerHTML = '';
                    isPutting = false;

                    innerBank.onpointerdown = activateInnerBank;
                }

                if (!k) {
                    putTimer = setTimeout(() => {
                        currentAudio = muteAudio = playSound('sounds/Win.mp3');

                        putTimer = setTimeout(showRestoreQuestion, 10);
                        timers[figure.id]['putTimer'] = putTimer;
                    }, 200);
                    timers[figure.id]['putTimer'] = putTimer;
                }
            }, transitionTime);
            timers[figure.id]['putTimer'] = putTimer;
        }

        function detectLocation(x, y) {
            innerBankRect = getRect(innerBank);

            figure.hidden = true;
            const elemBelow = document.elementFromPoint(x - window.pageXOffset, y - window.pageYOffset);
            figure.hidden = false;

            if (
                x >= innerBankRect.left && x <= (innerBankRect.left + innerBankRect.width) &&
                y >= innerBankRect.top && y <= (innerBankRect.top + innerBankRect.height)  &&
                elemBelow == innerBank
            ) {
                if (!putPermission) {
                    innerBank.style.backgroundColor = '#634186'; // Тёмно-фиолетовый
                    putPermission = true;
                }
            } else {
                if (putPermission) {
                    if (isPutting) innerBank.style.backgroundColor = puttingBGColor;
                    else innerBank.style.backgroundColor = '';
                    
                    putPermission = false;
                }
            }
        }

        function calcSpeed() {
            t2 = Date.now();
            tDelta = t2 - t1;
            figXDelta = figX2 - figX1;
            figYDelta = figY2 - figY1;
            distance = Math.sqrt(figXDelta ** 2 + figYDelta ** 2);
            speed = distance / tDelta;

            console.log(this.id + ' | tDelta = ' + tDelta);
            console.log(this.id + ' | distance = ' + distance);
            console.log(this.id + ' | speed = ' + speed);

            t1 = t2;
            x1 = x2;
            y1 = y2;
            figX1 = figX2;
            figY1 = figY2;
        }

        function getRect(elem) {
            const rect = elem.getBoundingClientRect();
          
            return {
                left: rect.left + window.pageXOffset,
                top: rect.top + window.pageYOffset,
                right: rect.right + window.pageXOffset,
                bottom: rect.bottom + window.pageYOffset,
                width: rect.width,
                height: rect.height
            };
        }

        function preventZoomOnWheel(event) {
            if (event.ctrlKey) {
                event.preventDefault();
            }
        }

        function preventZoomOnKeys(event) {
            if (event.ctrlKey && (event.key == '+' || event.key == '-')) {
                event.preventDefault();
            }
        }
    
        function moveFigureOnScroll() {
            x2 = x2 + window.pageXOffset - prevScrollX;
            y2 = y2 + window.pageYOffset - prevScrollY;
            figureInfo.innerHTML = x2.toFixed(0) + ':' + y2.toFixed(0);
            moveAt(x2, y2);
            detectLocation(x2, y2);

            prevScrollX = window.pageXOffset;
            prevScrollY = window.pageYOffset;

            figureRect = getRect(figure);
            figX2 = figureRect.left;
            figY2 = figureRect.top;
        }

        function showRestoreQuestion() {
            if (confirm('Restore elements?')) arrangeFigures()
            else {
                alert('Bye-bye!');
                currentAudio = playSound('sounds/End.mp3');

                const endScreen = document.createElement('div');
                endScreen.style.cssText = `
                    width: 100%;
                    height: 100%;
                    background-color: #000;
                    position: absolute;
                    top: -100%;
                    z-index: 100;
                    transition: 1000ms ease-in-out;
                `;
                document.body.append(endScreen);

                setTimeout(() => endScreen.style.top = 0, 0);
                setTimeout(() => {
                    document.body.innerHTML = '';
                    document.body.style.background = '#000';
                }, 3524); // Равняется длительности аудио End.mp3
            }
        }
    }
}
