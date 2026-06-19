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
    // 피커는 body에 — absolute 기준은 JS로 직접 계산
    const $picker = $(`<div id="qc-picker" class="qc-hidden"><div id="qc-picker-inner"></div></div>`);

    const $leftForm = $('#leftSendForm');
    if ($leftForm.length) {
        $leftForm.prepend($btn);
    } else {
        $('#send_form').prepend($btn);
    }

    $('body').append($picker);

    // 터치(삼성인터넷 등 모바일)와 마우스 클릭 분리 처리
    let _btnTouched = false;

    document.getElementById('qc-avatar-btn').addEventListener('touchend', function(e) {
        e.preventDefault(); // 터치 후 click 이벤트 중복 방지
        _btnTouched = true;
        togglePicker();
    }, { passive: false });

    $('#qc-avatar-btn').on('click', function(e) {
        if (_btnTouched) { _btnTouched = false; return; } // touchend가 처리했으면 skip
        togglePicker();
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
    if (!btn) return { bottom: 70, left: 8 };
    const r = btn.getBoundingClientRect();
    const pickerW = 248;
    let left = r.left;
    // 화면 오른쪽 넘치면 왼쪽으로 당기기
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
                <img src="${avatarUrl}" onerror="this.src='img/ai4.png'" />
                <span>${safeName}</span>
            </div>
        `);

        let _itemTouched = false;

        $item[0].addEventListener('touchend', function(e) {
            e.preventDefault();
            _itemTouched = true;
            selectChar(parseInt($(this).data('index')));
        }, { passive: false });

        $item.on('click', function(e) {
            if (_itemTouched) { _itemTouched = false; return; }
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
