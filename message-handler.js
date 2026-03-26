async function sendMessage(text, type = 'text') {
    if (!text || !text.trim() || !currentUser || !currentChannelId) return;
    
    const canSend = await checkChannelPermissions(currentChannelId, currentUser.id, 'send');
    if (!canSend) {
        Swal.fire('Access Denied', 'You do not have permission to send messages in this channel', 'error');
        return;
    }
    
    const slowmodeOk = await checkSlowmode(currentChannelId, currentUser.id);
    if (!slowmodeOk) return;
    
    const isMuted = await mutesRef.child(currentUser.id).once('value');
    if (isMuted.exists()) {
        const muteData = isMuted.val();
        if (muteData.expiresAt > Date.now()) {
            Swal.fire('Error', 'You are muted and cannot send messages', 'error');
            return;
        } else {
            await mutesRef.child(currentUser.id).remove();
        }
    }
    
    const sendBtn = document.getElementById('sendButton');
    if (sendBtn) sendBtn.disabled = true;
    
    try {
        const userData = await usersRef.child(currentUser.id).once('value');
        const userInfo = userData.val();
        
        const message = {
            text: text.trim(),
            username: currentUser.username,
            displayName: userInfo.displayName || currentUser.username,
            avatar: userInfo.avatar || null,
            userId: currentUser.id,
            timestamp: Date.now(),
            type: type,
            channelId: currentChannelId
        };
        
        await messagesRef.child(currentChannelId).push(message);
        const input = document.getElementById('messageInput');
        if (input) input.value = '';
    } catch (error) {
        console.error('Send error:', error);
    } finally {
        if (sendBtn) sendBtn.disabled = false;
    }
}

async function displayMessage(message, key) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    const isOwn = message.userId === currentUser.id;
    messageDiv.className = `message ${isOwn ? 'sent' : 'received'} ${message.type !== 'text' ? 'media-message' : ''}`;
    messageDiv.setAttribute('data-key', key);
    
    let timeStr = 'just now';
    if (message.timestamp) {
        const date = new Date(message.timestamp);
        timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    let userRole = '';
    const roleSnapshot = await userRolesRef.child(message.userId).once('value');
    if (roleSnapshot.exists()) {
        const roleId = roleSnapshot.val();
        const roleData = await rolesRef.child(roleId).once('value');
        if (roleData.exists()) {
            userRole = `<span class="role-badge" style="background: ${roleData.val().color};">${roleData.val().name}</span>`;
        }
    }
    
    const displayName = message.displayName || message.username;
    const avatarUrl = message.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2b2b2b&color=white&size=24`;
    
    let content = '';
    if (message.type === 'image' || message.type === 'gif') {
        content = `<img src="${escapeHtml(message.text)}" onclick="window.open('${escapeHtml(message.text)}', '_blank')" style="max-width: 300px; max-height: 300px; border-radius: 10px; cursor: pointer;" onerror="this.src='https://placehold.co/300x200/2b2b2b/white?text=Failed+to+load'">`;
    } else {
        content = `<div class="message-text">${escapeHtml(message.text)}</div>`;
    }
    
    messageDiv.innerHTML = `
        <div class="message-info">
            <img class="message-avatar" src="${avatarUrl}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2b2b2b&color=white&size=24'">
            <span>${escapeHtml(displayName)}</span>
            ${userRole}
            <span>• ${timeStr}</span>
        </div>
        ${content}
    `;
    
    messagesContainer.appendChild(messageDiv);
}

async function loadMessagesForChannel(channelId) {
    if (!channelId) return;
    
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '<div class="loading-text">Loading messages...</div>';
    
    try {
        const snapshot = await messagesRef.child(channelId).orderByChild('timestamp').once('value');
        
        const messages = [];
        snapshot.forEach(child => {
            messages.push({ key: child.key, ...child.val() });
        });
        
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        messagesContainer.innerHTML = '';
        
        for (const message of messages) {
            await displayMessage(message, message.key);
            messagesCache.set(message.key, message);
        }
        
        scrollToBottom();
        
        if (currentMessagesListener) {
            messagesRef.child(channelId).off('child_added', currentMessagesListener);
        }
        
        currentMessagesListener = messagesRef.child(channelId).orderByChild('timestamp').startAt(Date.now()).on('child_added', async function(snapshot) {
            const message = snapshot.val();
            const messageKey = snapshot.key;
            
            if (messagesCache.has(messageKey)) return;
            
            const canView = await checkChannelPermissions(message.channelId, currentUser.id, 'view');
            if (!canView) return;
            
            await displayMessage(message, messageKey);
            messagesCache.set(messageKey, message);
            scrollToBottom();
        });
    } catch (error) {
        console.error('Error loading messages:', error);
        messagesContainer.innerHTML = '<div class="loading-text">Error loading messages</div>';
    }
}

function updateSlowmodeIndicator() {
    const indicator = document.getElementById('slowmodeIndicator');
    if (!indicator || !currentChannelId) return;
    
    channelsRef.child(currentChannelId).once('value', (snapshot) => {
        const channel = snapshot.val();
        if (channel && channel.slowmode && channel.slowmode > 0) {
            indicator.textContent = `Slow Mode: ${channel.slowmode}s`;
            indicator.style.display = 'inline';
        } else {
            indicator.style.display = 'none';
        }
    });
}

function updateChannelName() {
    if (!currentChannelId) return;
    channelsRef.child(currentChannelId).once('value', (snapshot) => {
        const channel = snapshot.val();
        if (channel) {
            document.getElementById('channelName').textContent = `# ${channel.displayName || channel.name}`;
            updateSlowmodeIndicator();
        }
    });
}

async function switchChannel(channelId) {
    if (!channelId) return;
    
    const canView = await checkChannelPermissions(channelId, currentUser.id, 'view');
    if (!canView) {
        Swal.fire('Access Denied', 'You do not have permission to view this channel', 'error');
        return;
    }
    
    if (currentChannelId === channelId) return;
    
    if (currentMessagesListener && currentChannelId) {
        messagesRef.child(currentChannelId).off('child_added', currentMessagesListener);
    }
    
    currentChannelId = channelId;
    
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
    messagesCache.clear();
    
    await loadChannelsSidebar();
    await loadMessagesForChannel(channelId);
    updateChannelName();
}

async function loadChannelsSidebar() {
    const channelsList = document.getElementById('channelsList');
    if (!channelsList) return;
    
    channelsList.innerHTML = '<div class="loading-text">Loading channels...</div>';
    
    const snapshot = await channelsRef.once('value');
    channelsList.innerHTML = '';
    
    if (!snapshot.exists()) {
        const defaultChannelRef = channelsRef.push();
        await defaultChannelRef.set({
            name: 'general',
            displayName: 'General',
            createdBy: 'system',
            createdAt: Date.now(),
            owner: null,
            allowedToView: 'all',
            allowedToSend: 'all',
            slowmode: 0
        });
        currentChannelId = defaultChannelRef.key;
    }
    
    const channels = [];
    snapshot.forEach(child => {
        channels.push({ id: child.key, ...child.val() });
    });
    
    channels.sort((a, b) => a.createdAt - b.createdAt);
    
    let hasAccessibleChannel = false;
    
    for (const channel of channels) {
        const canView = await checkChannelPermissions(channel.id, currentUser.id, 'view');
        if (canView) {
            hasAccessibleChannel = true;
            const channelDiv = document.createElement('div');
            channelDiv.className = `channel-item ${currentChannelId === channel.id ? 'active' : ''}`;
            channelDiv.textContent = `# ${channel.displayName || channel.name}`;
            channelDiv.onclick = () => switchChannel(channel.id);
            channelsList.appendChild(channelDiv);
        }
    }
    
    if (!hasAccessibleChannel && channels.length > 0) {
        for (const channel of channels) {
            const canView = await checkChannelPermissions(channel.id, currentUser.id, 'view');
            if (canView) {
                currentChannelId = channel.id;
                break;
            }
        }
    }
    
    if (!currentChannelId && channels.length > 0) {
        currentChannelId = channels[0].id;
    }
    
    if (currentChannelId) {
        updateChannelName();
        updateSlowmodeIndicator();
        await loadMessagesForChannel(currentChannelId);
    } else if (channelsList.innerHTML === '') {
        channelsList.innerHTML = '<div class="loading-text">No channels available</div>';
    }
}
