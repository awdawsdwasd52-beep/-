function renderMainApp() {
    const displayName = currentUser.displayName || currentUser.username;
    const avatarUrl = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2b2b2b&color=white&size=32`;
    
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `
        <div class="app-container">
            <div class="channels-sidebar">
                <div class="channels-header">Channels</div>
                <div class="channels-list" id="channelsList"></div>
                ${isAdmin ? '<div class="add-channel-btn" onclick="window.createChannelWithConfig()">+ Create Channel</div>' : ''}
            </div>
            
            <div class="main-container">
                <div class="chat-header">
                    <div class="channel-info">
                        <h2 id="channelName"># Loading...</h2>
                        <p>Text channel <span id="slowmodeIndicator" class="slowmode-indicator" style="display:none;"></span></p>
                    </div>
                    <div class="user-profile">
                        <img src="${avatarUrl}" style="width: 32px; height: 32px; border-radius: 50%;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2b2b2b&color=white&size=32'">
                        <button class="profile-btn" onclick="window.showProfileModal()">${escapeHtml(displayName)}</button>
                        <button class="logout-btn" onclick="logout()">Logout</button>
                    </div>
                </div>
                <div class="chat-messages" id="chatMessages"></div>
                <div class="bottom-panel">
                    ${isAdmin ? '<button class="admin-btn" onclick="window.showAdminPanel()">Admin Panel</button>' : ''}
                    <div class="message-input-wrapper">
                        <input type="text" id="messageInput" placeholder="Type a message...">
                        <div class="media-buttons">
                            <button class="media-btn" onclick="window.showImageUploadDialog()">Image</button>
                            <button class="media-btn" onclick="window.showGifUploadDialog()">GIF</button>
                        </div>
                        <button id="sendButton" onclick="sendMessage(document.getElementById('messageInput').value)">Send</button>
                    </div>
                </div>
            </div>
            
            <div class="members-sidebar">
                <div class="members-header">Members</div>
                <div class="members-list" id="membersList"></div>
                <div class="status-text">Status: Work</div>
            </div>
        </div>
        
        <div id="adminModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Admin Panel</h2>
                    <button class="close-modal" onclick="document.getElementById('adminModal').style.display='none'">×</button>
                </div>
                <div class="admin-tabs">
                    <div class="admin-tab active" onclick="switchAdminTab('users')">Users</div>
                    <div class="admin-tab" onclick="switchAdminTab('roles')">Roles</div>
                    <div class="admin-tab" onclick="switchAdminTab('channels')">Channels</div>
                </div>
                <div id="usersPanel" class="admin-panel active">
                    <div class="user-list" id="usersList"></div>
                </div>
                <div id="rolesPanel" class="admin-panel">
                    <button class="add-channel-btn" onclick="window.createRole()">+ Create Role</button>
                    <div class="role-list" id="rolesList"></div>
                </div>
                <div id="channelsPanel" class="admin-panel">
                    <div class="channel-list" id="channelsListAdmin"></div>
                </div>
            </div>
        </div>
    `;
    
    loadChannelsSidebar();
    loadMembers();
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage(messageInput.value);
            }
        };
    }
}

async function init() {
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            const userCheck = await usersRef.child(userData.id).once('value');
            if (userCheck.exists()) {
                const userVal = userCheck.val();
                currentUser = {
                    id: userData.id,
                    username: userVal.username,
                    displayName: userVal.displayName,
                    avatar: userVal.avatar
                };
                
                const isBanned = await bansRef.child(currentUser.id).once('value');
                if (isBanned.exists()) {
                    const banData = isBanned.val();
                    if (!banData.expiresAt || banData.expiresAt > Date.now()) {
                        localStorage.removeItem('chatUser');
                        renderAuthScreen();
                        return;
                    } else {
                        await bansRef.child(currentUser.id).remove();
                    }
                }
                
                isAdmin = currentUser.username === ADMIN_USERNAME;
                renderMainApp();
                return;
            }
        } catch (error) {
            console.error('Auto login error:', error);
        }
    }
    
    renderAuthScreen();
}

init();
