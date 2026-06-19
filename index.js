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

function createUI() {
    if ($('#qc-avatar-btn').length) return;

    const $btn = $(`<div id="qc-avatar-btn" title="캐릭터 전환"><img id="qc-avatar-img" src="img/ai4.png" alt="캐릭터" /></div>`);
    const $picker = $(`<div id="qc-picker" class="qc-hidden"><div id="qc-picker-inner"></div></div>`);

    // [수정1] 버튼 삽입 위치 — 여러 후보를 순서대로 시도
    const targets = ['#leftSendForm', '#send_form', '#form_sheld', '.send_form'];
    let inserted = false;
    for (const sel of targets) {
        const $t = $(sel);
        if ($t.length) {
            $t.prepend($btn);
            inserted = true;
            break;
        }
    }
    // 아무 곳도 없으면 body에라도 붙이기
    if (!inserted) $('body').append($btn);

    $('body').append($picker);

    // [수정2] 모바일 호환: touchstart + click 둘 다 처리, passive 문제 우회
    let tapped = false;

    $('#qc-avatar-btn')[0].addEventListener('touchstart', function(e) {
        e.stopPropagation();
        tapped = true;
        togglePicker();
    }, { passive: true });

    $('#qc-avatar-btn').on('click', function(e) {
        if (tapped) { tapped = false; return; } // touchstart가 이미 처리했으면 skip
        e.preventDefault();
        e.stopPropagation();
        togglePicker();
    });

    // 피커 바깥 터치/클릭 → 닫기
    $(document).on('touchstart.qc click.qc', function(e) {
        if (!$(e.target).closest('#qc-picker, #qc-avatar-btn').length) {
            closePicker();
        }
    });

    updateAvatar();
}

function getPickerPos() {
    const btn = document.getElementById('qc-avatar-btn');
    if (!btn) return { bottom: 70, left: 8 };
    const r = btn.getBoundingClientRect();
    const pickerW = 256; // picker 실제 너비와 맞춤
    let left = r.left;
    if (left + pickerW > window.innerWidth - 8) {
        left = window.innerWidth - pickerW - 8;
    }
    return {
        bottom: window.innerHeight - r.top + 8,
        left: Math.max(8, left),
    };
}

function togglePicker() {
    const $p = $('#qc-picker');
    if ($p.hasClass('qc-hidden')) {
        populatePicker();
        const pos = getPickerPos();
        $p.css({ bottom: pos.bottom + 'px', left: pos.left + 'px', top: 'auto', right: 'auto' });
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
                <img src="${avatarUrl}" onerror="this.src='img/ai4.png'" loading="lazy" />
                <span>${safeName}</span>
            </div>
        `);

        // [수정3] 아이템도 touchstart + click 이중 처리
        let itemTapped = false;

        $item[0].addEventListener('touchstart', function(e) {
            e.stopPropagation();
            itemTapped = true;
            selectChar(parseInt($(this).data('index')));
        }, { passive: true });

        $item.on('click', function(e) {
            if (itemTapped) { itemTapped = false; return; }
            e.preventDefault();
            e.stopPropagation();
            selectChar(parseInt($(this).data('index')));
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
