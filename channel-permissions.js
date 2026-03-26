async function checkChannelPermissions(channelId, userId, action = 'send') {
    if (!channelId) return false;
    
    const channelSnapshot = await channelsRef.child(channelId).once('value');
    const channel = channelSnapshot.val();
    if (!channel) return action === 'send' ? false : true;
    
    if (channel.owner === userId) return true;
    
    const userRoleSnapshot = await userRolesRef.child(userId).once('value');
    const userRoleId = userRoleSnapshot.val();
    
    if (action === 'send') {
        if (!channel.allowedToSend || channel.allowedToSend === 'all') return true;
        if (channel.allowedToSend === 'roles' && userRoleId && channel.allowedRoles?.includes(userRoleId)) return true;
        if (channel.allowedToSend === 'users' && channel.allowedUsers?.includes(userId)) return true;
        return false;
    } else if (action === 'view') {
        if (!channel.allowedToView || channel.allowedToView === 'all') return true;
        if (channel.allowedToView === 'roles' && userRoleId && channel.viewRoles?.includes(userRoleId)) return true;
        if (channel.allowedToView === 'users' && channel.viewUsers?.includes(userId)) return true;
        return false;
    }
    return true;
}

async function checkSlowmode(channelId, userId) {
    if (!channelId) return true;
    
    const channelSnapshot = await channelsRef.child(channelId).once('value');
    const channel = channelSnapshot.val();
    if (!channel || !channel.slowmode || channel.slowmode === 0) return true;
    
    const lastMsgSnapshot = await messagesRef.child(channelId).orderByChild('timestamp').limitToLast(1).once('value');
    let lastTime = 0;
    lastMsgSnapshot.forEach(msg => {
        if (msg.val().userId === userId) {
            lastTime = msg.val().timestamp;
        }
    });
    
    const timeSince = Date.now() - lastTime;
    if (timeSince < channel.slowmode * 1000) {
        const waitSeconds = Math.ceil((channel.slowmode * 1000 - timeSince) / 1000);
        Swal.fire('Slow Mode', `Please wait ${waitSeconds} seconds before sending another message`, 'warning');
        return false;
    }
    return true;
}

async function configureChannel(channelId, channelName) {
    const channelSnapshot = await channelsRef.child(channelId).once('value');
    const channel = channelSnapshot.val() || {};
    
    const rolesSnapshot = await rolesRef.once('value');
    const roles = [];
    rolesSnapshot.forEach(child => {
        roles.push({ id: child.key, name: child.val().name });
    });
    
    const usersSnapshot = await usersRef.once('value');
    const users = [];
    usersSnapshot.forEach(child => {
        users.push({ id: child.key, name: child.val().displayName || child.val().username });
    });
    
    const { value: formValues } = await Swal.fire({
        title: `Configure #${channelName}`,
        html: `
            <div class="channel-permissions">
                <div class="permission-group">
                    <label>Who can view this channel?</label>
                    <select id="viewPermission" class="permission-select">
                        <option value="all" ${channel.allowedToView === 'all' ? 'selected' : ''}>Everyone</option>
                        <option value="roles" ${channel.allowedToView === 'roles' ? 'selected' : ''}>Specific Roles</option>
                        <option value="users" ${channel.allowedToView === 'users' ? 'selected' : ''}>Specific Users</option>
                    </select>
                </div>
                <div id="viewRolesContainer" class="permission-group" style="display: ${channel.allowedToView === 'roles' ? 'block' : 'none'}">
                    <label>Select roles:</label>
                    <select id="viewRoles" multiple class="permission-select" style="height: 100px;">
                        ${roles.map(r => `<option value="${r.id}" ${channel.viewRoles?.includes(r.id) ? 'selected' : ''}>${r.name}</option>`).join('')}
                    </select>
                </div>
                <div id="viewUsersContainer" class="permission-group" style="display: ${channel.allowedToView === 'users' ? 'block' : 'none'}">
                    <label>Select users:</label>
                    <select id="viewUsers" multiple class="permission-select" style="height: 100px;">
                        ${users.map(u => `<option value="${u.id}" ${channel.viewUsers?.includes(u.id) ? 'selected' : ''}>${u.name}</option>`).join('')}
                    </select>
                </div>
                
                <div class="permission-group" style="margin-top: 20px;">
                    <label>Who can send messages?</label>
                    <select id="sendPermission" class="permission-select">
                        <option value="all" ${channel.allowedToSend === 'all' ? 'selected' : ''}>Everyone</option>
                        <option value="roles" ${channel.allowedToSend === 'roles' ? 'selected' : ''}>Specific Roles</option>
                        <option value="users" ${channel.allowedToSend === 'users' ? 'selected' : ''}>Specific Users</option>
                    </select>
                </div>
                <div id="sendRolesContainer" class="permission-group" style="display: ${channel.allowedToSend === 'roles' ? 'block' : 'none'}">
                    <label>Select roles:</label>
                    <select id="sendRoles" multiple class="permission-select" style="height: 100px;">
                        ${roles.map(r => `<option value="${r.id}" ${channel.allowedRoles?.includes(r.id) ? 'selected' : ''}>${r.name}</option>`).join('')}
                    </select>
                </div>
                <div id="sendUsersContainer" class="permission-group" style="display: ${channel.allowedToSend === 'users' ? 'block' : 'none'}">
                    <label>Select users:</label>
                    <select id="sendUsers" multiple class="permission-select" style="height: 100px;">
                        ${users.map(u => `<option value="${u.id}" ${channel.allowedUsers?.includes(u.id) ? 'selected' : ''}>${u.name}</option>`).join('')}
                    </select>
                </div>
                
                <div class="permission-group" style="margin-top: 20px;">
                    <label>Slow Mode (seconds between messages):</label>
                    <input id="slowmode" type="number" class="slowmode-input" value="${channel.slowmode || 0}" min="0" step="1">
                    <span style="color: #888; margin-left: 10px;">0 = disabled</span>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        didOpen: () => {
            const viewSelect = document.getElementById('viewPermission');
            const sendSelect = document.getElementById('sendPermission');
            
            viewSelect.onchange = () => {
                document.getElementById('viewRolesContainer').style.display = viewSelect.value === 'roles' ? 'block' : 'none';
                document.getElementById('viewUsersContainer').style.display = viewSelect.value === 'users' ? 'block' : 'none';
            };
            
            sendSelect.onchange = () => {
                document.getElementById('sendRolesContainer').style.display = sendSelect.value === 'roles' ? 'block' : 'none';
                document.getElementById('sendUsersContainer').style.display = sendSelect.value === 'users' ? 'block' : 'none';
            };
        },
        preConfirm: () => {
            const viewPermission = document.getElementById('viewPermission').value;
            const sendPermission = document.getElementById('sendPermission').value;
            const slowmode = parseInt(document.getElementById('slowmode').value) || 0;
            
            const viewRoles = viewPermission === 'roles' ? 
                Array.from(document.getElementById('viewRoles').selectedOptions).map(opt => opt.value) : [];
            const viewUsers = viewPermission === 'users' ? 
                Array.from(document.getElementById('viewUsers').selectedOptions).map(opt => opt.value) : [];
            const sendRoles = sendPermission === 'roles' ? 
                Array.from(document.getElementById('sendRoles').selectedOptions).map(opt => opt.value) : [];
            const sendUsers = sendPermission === 'users' ? 
                Array.from(document.getElementById('sendUsers').selectedOptions).map(opt => opt.value) : [];
            
            return { viewPermission, sendPermission, viewRoles, viewUsers, sendRoles, sendUsers, slowmode };
        }
    });
    
    if (formValues) {
        await channelsRef.child(channelId).update({
            allowedToView: formValues.viewPermission,
            viewRoles: formValues.viewRoles,
            viewUsers: formValues.viewUsers,
            allowedToSend: formValues.sendPermission,
            allowedRoles: formValues.sendRoles,
            allowedUsers: formValues.sendUsers,
            slowmode: formValues.slowmode
        });
        Swal.fire('Success', 'Channel configuration saved', 'success');
        updateSlowmodeIndicator();
    }
}

async function createChannelWithConfig() {
    const { value: channelName } = await Swal.fire({
        title: 'Create Channel',
        input: 'text',
        inputPlaceholder: 'Channel name',
        showCancelButton: true,
        confirmButtonText: 'Next',
        cancelButtonText: 'Cancel'
    });
    
    if (!channelName) return;
    
    const rolesSnapshot = await rolesRef.once('value');
    const roles = [];
    rolesSnapshot.forEach(child => {
        roles.push({ id: child.key, name: child.val().name });
    });
    
    const usersSnapshot = await usersRef.once('value');
    const users = [];
    usersSnapshot.forEach(child => {
        users.push({ id: child.key, name: child.val().displayName || child.val().username });
    });
    
    const { value: formValues } = await Swal.fire({
        title: `Configure #${channelName}`,
        html: `
            <div class="channel-permissions">
                <div class="permission-group">
                    <label>Who can view this channel?</label>
                    <select id="viewPermission" class="permission-select">
                        <option value="all">Everyone</option>
                        <option value="roles">Specific Roles</option>
                        <option value="users">Specific Users</option>
                    </select>
                </div>
                <div id="viewRolesContainer" class="permission-group" style="display: none">
                    <label>Select roles:</label>
                    <select id="viewRoles" multiple class="permission-select" style="height: 100px;">
                        ${roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                    </select>
                </div>
                <div id="viewUsersContainer" class="permission-group" style="display: none">
                    <label>Select users:</label>
                    <select id="viewUsers" multiple class="permission-select" style="height: 100px;">
                        ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                    </select>
                </div>
                
                <div class="permission-group" style="margin-top: 20px;">
                    <label>Who can send messages?</label>
                    <select id="sendPermission" class="permission-select">
                        <option value="all">Everyone</option>
                        <option value="roles">Specific Roles</option>
                        <option value="users">Specific Users</option>
                    </select>
                </div>
                <div id="sendRolesContainer" class="permission-group" style="display: none">
                    <label>Select roles:</label>
                    <select id="sendRoles" multiple class="permission-select" style="height: 100px;">
                        ${roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                    </select>
                </div>
                <div id="sendUsersContainer" class="permission-group" style="display: none">
                    <label>Select users:</label>
                    <select id="sendUsers" multiple class="permission-select" style="height: 100px;">
                        ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                    </select>
                </div>
                
                <div class="permission-group" style="margin-top: 20px;">
                    <label>Slow Mode (seconds between messages):</label>
                    <input id="slowmode" type="number" class="slowmode-input" value="0" min="0" step="1">
                    <span style="color: #888; margin-left: 10px;">0 = disabled</span>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Create',
        cancelButtonText: 'Cancel',
        didOpen: () => {
            const viewSelect = document.getElementById('viewPermission');
            const sendSelect = document.getElementById('sendPermission');
            
            viewSelect.onchange = () => {
                document.getElementById('viewRolesContainer').style.display = viewSelect.value === 'roles' ? 'block' : 'none';
                document.getElementById('viewUsersContainer').style.display = viewSelect.value === 'users' ? 'block' : 'none';
            };
            
            sendSelect.onchange = () => {
                document.getElementById('sendRolesContainer').style.display = sendSelect.value === 'roles' ? 'block' : 'none';
                document.getElementById('sendUsersContainer').style.display = sendSelect.value === 'users' ? 'block' : 'none';
            };
        },
        preConfirm: () => {
            const viewPermission = document.getElementById('viewPermission').value;
            const sendPermission = document.getElementById('sendPermission').value;
            const slowmode = parseInt(document.getElementById('slowmode').value) || 0;
            
            const viewRoles = viewPermission === 'roles' ? 
                Array.from(document.getElementById('viewRoles').selectedOptions).map(opt => opt.value) : [];
            const viewUsers = viewPermission === 'users' ? 
                Array.from(document.getElementById('viewUsers').selectedOptions).map(opt => opt.value) : [];
            const sendRoles = sendPermission === 'roles' ? 
                Array.from(document.getElementById('sendRoles').selectedOptions).map(opt => opt.value) : [];
            const sendUsers = sendPermission === 'users' ? 
                Array.from(document.getElementById('sendUsers').selectedOptions).map(opt => opt.value) : [];
            
            return { viewPermission, sendPermission, viewRoles, viewUsers, sendRoles, sendUsers, slowmode };
        }
    });
    
    if (formValues) {
        const newChannelRef = channelsRef.push();
        const channelId = newChannelRef.key;
        await newChannelRef.set({
            name: channelName.toLowerCase().replace(/\s/g, '-'),
            displayName: channelName,
            createdBy: currentUser.username,
            createdAt: Date.now(),
            owner: currentUser.id,
            allowedToView: formValues.viewPermission,
            viewRoles: formValues.viewRoles,
            viewUsers: formValues.viewUsers,
            allowedToSend: formValues.sendPermission,
            allowedRoles: formValues.sendRoles,
            allowedUsers: formValues.sendUsers,
            slowmode: formValues.slowmode
        });
        
        Swal.fire('Success', `Channel #${channelName} created`, 'success');
        await loadChannelsSidebar();
        await switchChannel(channelId);
    }
}
