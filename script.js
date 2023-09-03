'use strict';

import { shuffle } from "./function_storage.js";

const docArea = document.getElementById('document-area');
const innerBank = document.getElementById('inner-bank');
const figAmount = document.getElementById('figures-amount');
const assorty = document.getElementById('assorted-figures');
const refresh = document.getElementById('refresh-button');
const soundSwitch = document.getElementById('sound-switch');
const SPEED_MEASURE_INTERVAL = 100; 
const whoaSounds = [
    'sounds/Whooaaaaa-1.mp3',
    'sounds/Whooaaaaa-2.mp3',
    'sounds/Whooaaaaa-3.mp3'
];
const INNER_BANK_MESSAGE = 'Put in!';
const PUT_MESSAGE = 'Whoooaaaaaa!';
let putTimer = null;
let finalPutTimer = null;
let muteAudio = null;
let muteSpeaker = false;
let currentAudio;
let k; // Подсчёт элементов

refreshFigures();

refresh.onclick = refreshFigures;
refresh.touchstart = refreshFigures;

innerBank.onmousedown = activateInnerBank;
innerBank.touchstart = activateInnerBank;

soundSwitch.onclick = switchSound;
soundSwitch.touchstart = switchSound;

function refreshFigures() {
    k = 0;
    createFigures();
    arrangeFigures();
}

function activateInnerBank() {
    innerBank.innerHTML = INNER_BANK_MESSAGE;
    innerBank.onmouseenter = () => innerBank.innerHTML = INNER_BANK_MESSAGE;
    innerBank.onmouseleave = () => innerBank.innerHTML = '';
    document.onmouseup = deactivateInnerBank;
    document.touchend = deactivateInnerBank;

    function deactivateInnerBank() {
        innerBank.innerHTML = '';
        innerBank.onmouseenter = null;
        innerBank.onmouseleave = null;
        document.onmouseup = null;
        document.touchend = null;
    }
}

function switchSound() {
    const speaker = this.querySelector('img');

    if (muteSpeaker) {
        this.style.backgroundColor = '#5bdfb3';
        speaker.src = 'images/speaker.png';
        muteSpeaker = false;
    } else {
        this.style.backgroundColor = '#f14646';
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
        green: '#65ff57',
        pink: '#ff6ec7',
        blue: '#6d77ff',
        brown: '#ffb03b',
        skyblue: '#7affff'
    };

    clearTimeout(putTimer);
    clearTimeout(finalPutTimer);
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
    const figureWraps = assorty.querySelectorAll('.figure-wrap');
    const figures = assorty.querySelectorAll('.figure');
    let putPermission = false;
    let lastPuttedBeforePause = null;
    let lastWhoaIndex = null;

    innerBank.style.backgroundColor = '';
    innerBank.innerHTML = '';

    currentAudio = playSound('sounds/Start.mp3');

    for (let figure of figures) {
        k++;
        figure.hidden = false;
        const figureInfo = figure.querySelector('.figure-info');
        figureInfo.innerHTML = '(Not moved)';
        if (figure.classList.contains('put-in')) figure.classList.remove('put-in');

        figureWraps[k - 1].style.height = getComputedStyle(figure).height;
        figureWraps[k - 1].style.width = getComputedStyle(figure).width;
        figure.style.left = '';
        figure.style.top = '';
        figure.style.bottom = '';
        figure.style.right = '';
        figureWraps[k - 1].append(figure);

        figure.onmousedown = dragAndDrop;
        figure.touchstart = dragAndDrop;
        figure.ondragstart = () => false;
    }

    function dragAndDrop(event) {
        if (event.button != 0) return;

        event.preventDefault();

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
        const figureInfo = figure.querySelector('.figure-info');
        let innerBankRect = getRect(innerBank);
        let figureRect = getRect(figure);
        let figX1 = figureRect.left;
        let figY1 = figureRect.top;
        let figX2 = figX1;
        let figY2 = figY1;
        const figureShiftX = event.pageX - figX1;
        const figureShiftY = event.pageY - figY1;
        let x1, y1, x2, y2, t1, t2, tDelta, distance, speed;
        let prevScrollX = window.pageXOffset;
        let prevScrollY = window.pageYOffset;
        let speedMeasureTimer = null;

        innerBank.onmousedown = null;
        innerBank.touchstart = null;
        putPermission = false;
    
        figure.style.zIndex = 10;
        figure.style.filter = 'brightness(90%)';
        figure.style.cursor = 'grabbing';
        assorty.append(figure);

        t1 = t2 = Date.now();
        x1 = x2 = event.pageX;
        y1 = y2 = event.pageY;
        figureInfo.innerHTML = x2 + ':' + y2;
        moveAt(x1, y1);
        detectLocation(x1, y1);

        innerBank.innerHTML = this.id[0].toUpperCase() + this.id.slice(1);
        innerBank.innerHTML += '<br>(Speed = 0.00 px/ms)';
        
        document.addEventListener('scroll', moveFigureOnScroll);
        document.addEventListener('mousemove', moveFigure);
        document.addEventListener('touchmove', moveFigure);
        docArea.addEventListener('wheel', preventWheel); // Запрет масштабирования при нажатом Control
        docArea.onmouseup = leaveFigure.bind(this);
        docArea.touchend = leaveFigure.bind(this);
        // Защита при отжатии кнопки мыши за окном - при следующих нажатиях ничего не происходит,
        // пока функция не будет снова назначена при отжатии кнопки мыши на элементе
        figure.onmousedown = null;
        figure.touchstart = null;

        speedMeasureTimer = setInterval(() => { // this = figure, т. к. стрелочная функция не имеет своего this
            //console.log(`(${x1}, ${y1}) => (${x2}, ${y2})`);

            innerBank.innerHTML = this.id[0].toUpperCase() + this.id.slice(1);
            
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
                detectLocation(x2, y2);
                t1 = Date.now();
                innerBank.innerHTML += '<br>(Speed = 0.00 px/ms)';

            }
        }, SPEED_MEASURE_INTERVAL);

        //console.log('\nBegin speed measurement:');

        function moveAt(pageX, pageY) {
            let x = pageX - figureShiftX;
            if (x < 0) x = 0;
            if (x > docWidth - figureRect.width) x = docWidth - figureRect.width;
            x = x * 100 / docWidth;
            figure.style.left = `calc(${x}%)`;
    
            let y = pageY - figureShiftY;
            if (y < 0) y = 0;
            if (y > docHeight - figureRect.height) y = docHeight - figureRect.height;
            y = y * 100 / docHeight;
            figure.style.top = `calc(${y}%)`;
        }
        
        function moveFigure(event) {
            x2 = event.pageX;
            y2 = event.pageY;
            figureInfo.innerHTML = x2 + ':' + y2;
            moveAt(x2, y2);
            detectLocation(x2, y2);

            figureRect = getRect(figure);
            figX2 = figureRect.left;
            figY2 = figureRect.top;
        }
    
        function leaveFigure(event) {
            clearInterval(speedMeasureTimer);

            document.removeEventListener('scroll', moveFigureOnScroll);
            document.removeEventListener('mousemove', moveFigure);
            docArea.removeEventListener('wheel', preventWheel);
            docArea.onmouseup = null;
            docArea.touchend = null;

            figure.style.filter = '';
            figure.style.cursor = 'grab';

            //console.log('-----Final calculations-----');
            x2 = event.pageX;
            y2 = event.pageY;
            //console.log(`(${x1}, ${y1}) => (${x2}, ${y2})`);
            calcSpeed();
    
            if (putPermission) {
                // Аудиоблок Whooaaaaa
                let indexes = [0, 1, 2];
                if (lastWhoaIndex != null) indexes.splice(lastWhoaIndex, 1);
                shuffle(indexes);
                currentAudio = playSound(whoaSounds[indexes[0]]);
                lastWhoaIndex = indexes[0];

                let x = innerBankRect.left + innerBankRect.width / 2 - figureRect.width / 2;
                let y = innerBankRect.top + innerBankRect.height / 2 - figureRect.height / 2;
                figure.style.left = x + 'px';
                figure.style.top = y + 'px';

                innerBank.style.backgroundColor = '#d1eaff';
                innerBank.innerHTML = PUT_MESSAGE;
                figureInfo.innerHTML = '(Putted)';
                figure.style.zIndex = '';
                figure.classList.add('put-in');
                lastPuttedBeforePause = figure;
                putPermission = false;

                const transitionTime = parseFloat(getComputedStyle(assorty.querySelector('.put-in'))
                    .transitionDuration) * 1000;

                putTimer = setTimeout(() => {
                    figure.hidden = true;
                    k--;

                    if (lastPuttedBeforePause == figure) {
                        if (!putPermission) innerBank.style.backgroundColor = '';
                        if (innerBank.innerHTML == PUT_MESSAGE) innerBank.innerHTML = '';

                        innerBank.onmousedown = activateInnerBank;
                        innerBank.touchstart = activateInnerBank;
                    }

                    if (!k) finalPutTimer = setTimeout(() => {
                        currentAudio = muteAudio = playSound('sounds/Win.mp3');
                        setTimeout(showRestoreQuestion, 10);
                    }, 200);
                }, transitionTime);
            } else {
                innerBank.onmousedown = activateInnerBank;
                innerBank.touchstart = activateInnerBank;
                figure.onmousedown = dragAndDrop; // Снова назначить функцию на нажатие, чтобы снять защиту
                figure.touchstart = dragAndDrop;    // Снова назначить функцию на нажатие, чтобы снять защиту
                figureInfo.innerHTML = '(Stopped)';
                
                innerBank.innerHTML = this.id[0].toUpperCase() + this.id.slice(1);
                innerBank.innerHTML += '<br>(Speed = ' + speed.toFixed(2) + ' px/ms)';

                setTimeout(() => {
                    if (innerBank.innerHTML != INNER_BANK_MESSAGE) innerBank.innerHTML = '';
                }, 0);
            }
        }

        function getRect(elem) {
            let rect = elem.getBoundingClientRect();
          
            return {
                left: rect.left + window.pageXOffset,
                top: rect.top + window.pageYOffset,
                right: rect.right + window.pageXOffset,
                bottom: rect.bottom + window.pageYOffset,
                width: rect.width,
                height: rect.height
            };
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

        function preventWheel(event) {
            if (event.ctrlKey) event.preventDefault();
        }

        function detectLocation(pageX, pageY) {
            innerBankRect = getRect(innerBank);

            figure.hidden = true;
            let elemBelow = document.elementFromPoint(pageX - window.pageXOffset, pageY - window.pageYOffset);
            figure.hidden = false;

            if (
                pageX >= innerBankRect.left && pageX <= (innerBankRect.left + innerBankRect.width) &&
                pageY >= innerBankRect.top && pageY <= (innerBankRect.top + innerBankRect.height)  &&
                elemBelow == innerBank
            ) {
                if (!putPermission) {
                    enterBank(innerBank);
                    putPermission = true;
                }
            } else {
                if (putPermission) {
                    leaveBank(innerBank);
                    putPermission = false;
                }
            }

            function enterBank(putElem) {
                putElem.style.backgroundColor = '#634186';
            }
        
            function leaveBank(putElem) {
                putElem.style.backgroundColor = '';
            }
        }

        function calcSpeed() {
            t2 = Date.now();
            tDelta = t2 - t1;
            distance = Math.sqrt((figX2 - figX1) ** 2 + (figY2 - figY1) ** 2);
            speed = distance / tDelta;

            //console.log(this.id + ' | tDelta = ' + tDelta);
            //console.log(this.id + ' | distance = ' + distance);
            //console.log(this.id + ' | speed = ' + speed);

            t1 = t2;
            x1 = x2;
            y1 = y2;
            figX1 = figX2;
            figY1 = figY2;
        }

        function showRestoreQuestion() {
            if (confirm('Restore elements?')) arrangeFigures()
            else {
                alert('Bye-bye!');
                currentAudio = playSound('sounds/End.mp3');

                let endScreen = document.createElement('div');
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
