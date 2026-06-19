// Quick Character Extension

const MODULE_NAME = 'quick-character';

function getCtx() {
    return SillyTavern.getContext();
}

function getAvatarUrl(character) {
    if (!character?.avatar) return 'img/ai4.png';
    try {
        return getCtx().getThumbnailUrl('avatar', character.avatar);
    } catch {
        return `thumbnails/avatar/${character.avatar}`;
    }
}

// 터치 시작점과 끝점 거리 계산 — 10px 이상 움직이면 스크롤로 판단
function isTap(startX, startY, endX, endY) {
    return Math.abs(endX - startX) < 10 && Math.abs(endY - startY) < 10;
}

function createUI() {
    if ($('#qc-avatar-btn').length) return;

    const $btn = $(`<div id="qc-avatar-btn" title="캐릭터 전환"><img id="qc-avatar-img" src="img/ai4.png" alt="캐릭터" /></div>`);
    const $picker = $(`<div id="qc-picker" class="qc-hidden"><div id="qc-picker-inner"></div></div>`);

    const $leftForm = $('#leftSendForm');
    if ($leftForm.length) {
        $leftForm.prepend($btn);
    } else {
        $('#send_form').prepend($btn);
    }

    $('body').append($picker);

    // 버튼 터치
    let _btnStart = null;
    document.getElementById('qc-avatar-btn').addEventListener('touchstart', function(e) {
        _btnStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    document.getElementById('qc-avatar-btn').addEventListener('touchend', function(e) {
        if (!_btnStart) return;
        const t = e.changedTouches[0];
        if (isTap(_btnStart.x, _btnStart.y, t.clientX, t.clientY)) {
            e.preventDefault();
            togglePicker();
        }
        _btnStart = null;
    }, { passive: false });

    $('#qc-avatar-btn').on('click', function() {
        // 터치 기기가 아닌 경우(PC 마우스)만 실행
        if (!('ontouchstart' in window)) togglePicker();
    });

    // 피커 바깥 터치/클릭 → 닫기
    document.addEventListener('touchend', function(e) {
        if (!$(e.target).closest('#qc-picker, #qc-avatar-btn').length) {
            closePicker();
        }
    }, { passive: true });

    $(document).on('click.qc', function(e) {
        if (!$(e.target).closest('#qc-picker, #qc-avatar-btn').length) {
            closePicker();
        }
    });

    updateAvatar();
}

function getPickerPos() {
    const btn = document.getElementById('qc-avatar-btn');
    const pickerW = 248;
    const pickerH = 300;

    const vh = document.documentElement.clientHeight || window.innerHeight;
    const vw = document.documentElement.clientWidth || window.innerWidth;

    if (!btn) {
        return { top: Math.max(8, vh - pickerH - 80) + 'px', left: '8px', bottom: 'auto', right: 'auto' };
    }

    const r = btn.getBoundingClientRect();
    const spaceAbove = r.top;
    const spaceBelow = vh - r.bottom;

    let top;
    if (spaceAbove >= pickerH || spaceAbove >= spaceBelow) {
        top = r.top - pickerH - 8;
    } else {
        top = r.bottom + 8;
    }
    top = Math.max(8, Math.min(top, vh - pickerH - 8));

    let left = r.left;
    if (left + pickerW > vw - 8) left = vw - pickerW - 8;
    left = Math.max(8, left);

    return { top: top + 'px', left: left + 'px', bottom: 'auto', right: 'auto' };
}

function togglePicker() {
    const $p = $('#qc-picker');
    if ($p.hasClass('qc-hidden')) {
        populatePicker();
        $p.css(getPickerPos());
        $p.removeClass('qc-hidden').addClass('qc-visible');
    } else {
        closePicker();
    }
}

function closePicker() {
    $('#qc-picker').removeClass('qc-visible').addClass('qc-hidden');
}

function populatePicker() {
    const $inner = $('#qc-picker-inner');
    $inner.empty();

    const ctx = getCtx();
    const chars = ctx.characters ?? [];
    const currentChid = ctx.characterId;
    const aiChars = chars.filter(c => c && c.name && c.avatar && c.avatar !== 'none');

    if (aiChars.length === 0) {
        $inner.append('<div class="qc-empty">캐릭터가 없습니다</div>');
        return;
    }

    aiChars.forEach((char) => {
        const idx = chars.indexOf(char);
        const isActive = idx === currentChid;
        const safeName = $('<div>').text(char.name).html();
        const avatarUrl = getAvatarUrl(char);

        const $item = $(`
            <div class="qc-item${isActive ? ' qc-active' : ''}" data-index="${idx}" title="${safeName}">
                <img src="${avatarUrl}" onerror="this.src='img/ai4.png'" />
                <span>${safeName}</span>
            </div>
        `);

        // 아이템도 탭/스크롤 구분
        let _itemStart = null;

        $item[0].addEventListener('touchstart', function(e) {
            _itemStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, { passive: true });

        $item[0].addEventListener('touchend', function(e) {
            if (!_itemStart) return;
            const t = e.changedTouches[0];
            if (isTap(_itemStart.x, _itemStart.y, t.clientX, t.clientY)) {
                e.preventDefault();
                selectChar(parseInt($(this).data('index')));
            }
            _itemStart = null;
        }, { passive: false });

        $item.on('click', function() {
            if (!('ontouchstart' in window)) selectChar(parseInt($(this).data('index')));
        });

        $inner.append($item);
    });
}

async function selectChar(idx) {
    const ctx = getCtx();
    if (!ctx.characters?.[idx]) return;
    closePicker();
    try {
        await ctx.selectCharacterById(idx);
        setTimeout(updateAvatar, 400);
    } catch(err) {
        console.error('[QuickCharacter] 전환 실패:', err);
    }
}

function updateAvatar() {
    const ctx = getCtx();
    const char = ctx.characters?.[ctx.characterId];
    const $img = $('#qc-avatar-img');
    if (!$img.length) return;
    if (char) {
        $img.attr('src', getAvatarUrl(char));
        $img.attr('alt', char.name);
        $('#qc-avatar-btn').attr('title', char.name + ' (전환)');
    } else {
        $img.attr('src', 'img/ai4.png');
        $('#qc-avatar-btn').attr('title', '캐릭터 전환');
    }
}

function registerEvents() {
    const { eventSource, event_types } = getCtx();
    if (!eventSource || !event_types) return;
    eventSource.on(event_types.CHAT_CHANGED, updateAvatar);
    eventSource.on(event_types.CHARACTER_SELECTED, updateAvatar);
}

jQuery(async () => {
    const { eventSource, event_types } = getCtx();
    if (eventSource && event_types) {
        eventSource.on(event_types.APP_READY, () => {
            createUI();
            registerEvents();
        });
    } else {
        createUI();
    }
    console.log('[QuickCharacter] loaded ✓');
});
