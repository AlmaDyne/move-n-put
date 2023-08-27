'use strict';

const innerBox = document.getElementById('inner-box');
const figAmount = document.getElementById('figures-amount');
const assorty = document.getElementById('assorted-figures');
const refresh = document.getElementById('refresh-button');
const baseElem1 = document.getElementById('base-elem1');
const baseElem2 = document.getElementById('base-elem2');
const baseElem3 = document.getElementById('base-elem3');
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
let k = 0; // Подсчёт элементов

let elAmount = createFigures();
restoreFigures(elAmount);

refresh.onclick = () => {
    k = 0;
    elAmount = createFigures();
    restoreFigures(elAmount);
};

innerBox.onmousedown = () => {
    innerBox.innerHTML = 'Put in!';
    document.onmouseup = () => innerBox.innerHTML = '';
};

function createFigures() {
    assorty.innerHTML = '';

    if (+figAmount.value < figAmount.min) figAmount.value = figAmount.min;
    if (+figAmount.value > figAmount.max) figAmount.value = figAmount.max;
    const n = figAmount.value;

    for (let i = 1; i <= n; i++) {
        let fig = document.createElement('div');
        fig.id = 'base-elem' + i;
        fig.className = 'figure';
        fig.insertAdjacentHTML('afterbegin', '<p><b>Move and put!</b></p>');
        fig.insertAdjacentHTML('beforeend', '<p class="base-info">(Not moved)</p>');
        assorty.append(fig);
    }

    return n;
}

function restoreFigures(n) {
    const FIG_WIDTH = parseInt(getComputedStyle(document.querySelector('.figure')).width);
    const figures = assorty.querySelectorAll('.figure');
    const space = (n > 1) ? ((docWidth - FIG_WIDTH * n) / (n - 1)) : 0;
    //console.log(figures);

    for (let figure of figures) {
        k++;
        const baseInfo = figure.querySelector('.base-info');
        baseInfo.innerHTML = '(Not moved)';

        if (figure.classList.contains('put-in')) figure.classList.remove('put-in');

        figure.style.top = '';
        figure.style.bottom = 0;
        figure.style.right = '';
        figure.style.left = (n == 1) ? `calc(50% - ${FIG_WIDTH}px / 2)` : ((space + FIG_WIDTH) * (k - 1) + 'px');
        
        figure.onmousedown = dragAndDrop;
        figure.ondragstart = () => false;
        figure.hidden = false;
    }

    function dragAndDrop(event) {
        const elem = event.target.closest('.figure');
        const baseInfo = elem.querySelector('.base-info');
        let elemRect = elem.getBoundingClientRect();
        let xOnElem = event.clientX - elemRect.left;
        let yOnElem = event.clientY - elemRect.top;
        let currentDropElem = null;
    
        elem.style.zIndex = 999;
        elem.style.filter = 'brightness(90%)';
        elem.style.cursor = 'grabbing';
        assorty.append(elem);
    
        moveAt(event.pageX, event.pageY);
    
        document.addEventListener('mousemove', onMouseMove);
    
        elem.onmouseup = onMouseUp;
    
        // Защита при отжатии кнопки мыши за окном - при следующих нажатиях ничего не происходит,
        // пока функция не будет снова назначена при отжатии кнопки мыши на элементе
        elem.onmousedown = null;
    
        function moveAt(pageX, pageY) {
            let x = pageX - xOnElem;
            if (x < 0) x = 0;
            if (x > docWidth - elemRect.width) x = docWidth - elemRect.width;
            elem.style.left = x + 'px';
    
            let y = pageY - yOnElem;
            if (y < 0) y = 0;
            if (y > docHeight - elemRect.height) y = docHeight - elemRect.height;
            elem.style.top = y + 'px';
        }
        
        function onMouseMove(event) {
            moveAt(event.pageX, event.pageY);
            baseInfo.innerHTML = event.pageX + ':' + event.pageY;
    
            elem.hidden = true;
            let elemBelow = document.elementFromPoint(event.clientX, event.clientY);
            elem.hidden = false;
    
            if (!elemBelow) return;
    
            let dropElemBelow = elemBelow.closest('#inner-box');
    
            if (currentDropElem != dropElemBelow) {
                if (currentDropElem) {
                    leaveDroppable(currentDropElem);
                }
                currentDropElem = dropElemBelow;
                if (currentDropElem) {
                    enterDroppable(currentDropElem);
                }
            }
        }
    
        function leaveDroppable(dropElem) {
            dropElem.style.backgroundColor = '';
        }
    
        function enterDroppable(dropElem) {
            dropElem.style.backgroundColor = '#634186';
        }
    
        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            elem.onmouseup = null;
            elem.style.filter = '';
            elem.style.cursor = 'grab';
    
            if (currentDropElem) {
                const innerBoxRect = innerBox.getBoundingClientRect();
                const elemRect = elem.getBoundingClientRect();
                let x = innerBoxRect.left + innerBoxRect.width / 2 - elemRect.width / 2;
                let y = innerBoxRect.top + innerBoxRect.height / 2 - elemRect.height / 2;
                elem.style.left = x + 'px';
                elem.style.top = y + 'px';

                leaveDroppable(currentDropElem);
                currentDropElem.style.backgroundColor = '#d1eaff';
                baseInfo.innerHTML = 'Whoooaaaaaa!';
                elem.classList.add('put-in');
                const transTime = parseFloat(getComputedStyle(assorty.querySelector('.put-in')).transitionDuration) * 1000;
                k--;

                setTimeout(() => {
                    elem.hidden = true;
                    currentDropElem.style.backgroundColor = '';

                    if (!k) {
                        setTimeout(() => showRestoreQuestion(), 200);
                    }
                }, transTime);
            } else {
                elem.onmousedown = dragAndDrop; // Снова назначить функцию на нажатие, чтобы снять защиту
                baseInfo.innerHTML = '(Stopped)';
            }
        }
    
        function showRestoreQuestion() {
            if (confirm('Restore elements?')) restoreFigures(elAmount)
            else {
                alert('Bye-bye!');
                document.body.innerHTML = '';
                document.body.style.backgroundColor = 'black';
            }
        }
    }
}
