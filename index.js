// Quick Character Extension
// 입력창 위 이모티콘 바 옆에 현재 캐릭터 아바타 버튼 삽입
// 클릭 시 캐릭터 피커 팝업, 선택 시 selectCharacterById로 전환

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

    // 이모티콘 버튼들이 있는 바(#extensionsMenu 포함된 라인) 옆에 삽입
    // ST의 send_form 안 왼쪽 버튼 그룹: #leftSendForm 또는 #data_bank_wand_container 근처
    const $btn = $(`
        <div id="qc-avatar-btn" title="캐릭터 전환">
            <img id="qc-avatar-img" src="img/ai4.png" alt="캐릭터" />
        </div>
    `);

    const $picker = $(`
        <div id="qc-picker" class="qc-hidden">
            <div id="qc-picker-inner"></div>
        </div>
    `);

    // leftSendForm이 있으면 그 앞에, 없으면 send_form 첫번째 자식으로
    const $leftForm = $('#leftSendForm');
    if ($leftForm.length) {
        $leftForm.prepend($btn);
    } else {
        // 대부분 ST 버전에서 이모티콘들은 #send_form > :first-child 아래
        $('#send_form').prepend($btn);
    }

    // 피커는 body에 붙여서 위치 자유롭게
    $('body').append($picker);

    $('#qc-avatar-btn').on('click', function(e) {
        e.stopPropagation();
        togglePicker();
    });

    $(document).on('click.qc', function() {
        closePicker();
    });

    $('#qc-picker').on('click', function(e) {
        e.stopPropagation();
    });

    updateAvatar();
}

function getPickerPosition() {
    const btn = document.getElementById('qc-avatar-btn');
    if (!btn) return { bottom: 60, left: 10 };
    const rect = btn.getBoundingClientRect();
    return {
        bottom: window.innerHeight - rect.top + 6,
        left: Math.max(4, rect.left),
    };
}

function togglePicker() {
    const $p = $('#qc-picker');
    if ($p.hasClass('qc-hidden')) {
        populatePicker();
        const pos = getPickerPosition();
        $p.css({ bottom: pos.bottom + 'px', left: pos.left + 'px' });
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

        $item.on('click', function() {
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
        // 공식 API: selectCharacterById
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
