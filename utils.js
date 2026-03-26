function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function getDirectGifUrl(url) {
    if (url.includes('tenor.com')) {
        const match = url.match(/\/view\/(?:[^-]+-)*([a-zA-Z0-9]+)/);
        if (match && match[1]) {
            return `https://media.tenor.com/${match[1]}/tenor.gif`;
        }
    }
    return url;
}

function uploadFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    
    if (tab === 'users') {
        document.querySelector('.admin-tab:first-child').classList.add('active');
        document.getElementById('usersPanel').classList.add('active');
    } else if (tab === 'roles') {
        document.querySelector('.admin-tab:nth-child(2)').classList.add('active');
        document.getElementById('rolesPanel').classList.add('active');
    } else if (tab === 'channels') {
        document.querySelector('.admin-tab:nth-child(3)').classList.add('active');
        document.getElementById('channelsPanel').classList.add('active');
    }
}
