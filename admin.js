function showAdminPanel() {
    if (!isAdmin) {
        Swal.fire('Error', 'You do not have admin permissions', 'error');
        return;
    }
    document.getElementById('adminModal').style.display = 'block';
    loadAdminData();
}

async function loadAdminData() {
    await loadUsersList();
    await loadRolesList();
    await loadChannelsList();
}

async function loadUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    usersList.innerHTML = '<div class="loading-text">Loading...</div>';
    
    const snapshot = await usersRef.once('value');
    usersList.innerHTML = '';
    
    snapshot.forEach(child => {
        const user = child.val();
        const displayName = user.displayName || user.username;
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.innerHTML = `
            <span>${escapeHtml(displayName)} (${escapeHtml(user.username)}) ${user.username === ADMIN_USERNAME ? '👑' : ''}</span>
            <div>
                <button class="ban-btn" onclick="banUser('${child.key}', '${escapeHtml(user.username)}')">Ban</button>
                <button class="mute-btn" onclick="muteUser('${child.key}', '${escapeHtml(user.username)}')">Mute</button>
                <button class="edit-btn" onclick="assignRole('${child.key}', '${escapeHtml(user.username)}')">Role</button>
            </div>
        `;
        usersList.appendChild(userDiv);
    });
}

async function loadRolesList() {
    const rolesList = document.getElementById('rolesList');
    if (!rolesList) return;
    rolesList.innerHTML = '<div class="loading-text">Loading...</div>';
    
    const snapshot = await rolesRef.once('value');
    rolesList.innerHTML = '';
    
    snapshot.forEach(child => {
        const role = child.val();
        const roleDiv = document.createElement('div');
        roleDiv.className = 'role-item';
        roleDiv.innerHTML = `
            <span style="color: ${role.color};">${escapeHtml(role.name)}</span>
            <div>
                <button class="edit-btn" onclick="editRole('${child.key}', '${escapeHtml(role.name)}', '${role.color}')">Edit</button>
                <button class="delete-btn" onclick="deleteRole('${child.key}')">Delete</button>
            </div>
        `;
        rolesList.appendChild(roleDiv);
    });
}

async function loadChannelsList() {
    const channelsList = document.getElementById('channelsListAdmin');
    if (!channelsList) return;
    channelsList.innerHTML = '<div class="loading-text">Loading...</div>';
    
    const snapshot = await channelsRef.once('value');
    channelsList.innerHTML = '';
    
    snapshot.forEach(child => {
        const channel = child.val();
        const channelDiv = document.createElement('div');
        channelDiv.className = 'channel-item-admin';
        channelDiv.innerHTML = `
            <span># ${escapeHtml(channel.displayName || channel.name)}</span>
            <div>
                <button class="config-btn" onclick="configureChannel('${child.key}', '${escapeHtml(channel.displayName || channel.name)}')">⚙️</button>
                <button class="edit-btn" onclick="editChannel('${child.key}', '${escapeHtml(channel.displayName || channel.name)}')">Edit</button>
                <button class="delete-btn" onclick="deleteChannel('${child.key}')">Delete</button>
            </div>
        `;
        channelsList.appendChild(channelDiv);
    });
}

async function banUser(userId, username) {
    const { value: duration } = await Swal.fire({
        title: `Ban ${username}`,
        input: 'select',
        inputOptions: {
            'permanent': 'Permanent',
            '3600000': '1 hour',
            '86400000': '1 day',
            '604800000': '1 week'
        },
        showCancelButton: true,
        confirmButtonText: 'Ban',
        cancelButtonText: 'Cancel'
    });
    
    if (duration) {
        const banData = {
            userId: userId,
            username: username,
            bannedBy: currentUser.username,
            timestamp: Date.now(),
            expiresAt: duration === 'permanent' ? null : Date.now() + parseInt(duration)
        };
        await bansRef.child(userId).set(banData);
        Swal.fire('Success', `${username} has been banned`, 'success');
    }
}

async function muteUser(userId, username) {
    const { value: duration } = await Swal.fire({
        title: `Mute ${username}`,
        input: 'select',
        inputOptions: {
            '600000': '10 minutes',
            '3600000': '1 hour',
            '86400000': '1 day'
        },
        showCancelButton: true,
        confirmButtonText: 'Mute',
        cancelButtonText: 'Cancel'
    });
    
    if (duration) {
        const muteData = {
            userId: userId,
            username: username,
            mutedBy: currentUser.username,
            timestamp: Date.now(),
            expiresAt: Date.now() + parseInt(duration)
        };
        await mutesRef.child(userId).set(muteData);
        Swal.fire('Success', `${username} has been muted`, 'success');
    }
}

async function assignRole(userId, username) {
    const rolesSnapshot = await rolesRef.once('value');
    const roles = [];
    rolesSnapshot.forEach(child => {
        roles.push({ id: child.key, name: child.val().name });
    });
    
    if (roles.length === 0) {
        Swal.fire('Error', 'Create roles first', 'error');
        return;
    }
    
    const { value: roleId } = await Swal.fire({
        title: `Assign role to ${username}`,
        input: 'select',
        inputOptions: Object.fromEntries(roles.map(r => [r.id, r.name])),
        showCancelButton: true,
        confirmButtonText: 'Assign',
        cancelButtonText: 'Cancel'
    });
    
    if (roleId) {
        await userRolesRef.child(userId).set(roleId);
        Swal.fire('Success', `Role assigned to ${username}`, 'success');
        loadMembers();
    }
}

function createRole() {
    Swal.fire({
        title: 'Create Role',
        html: `
            <input id="roleName" class="swal2-input" placeholder="Role name">
            <input id="roleColor" class="swal2-input" type="color" value="#667eea">
        `,
        showCancelButton: true,
        confirmButtonText: 'Create',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
            const name = document.getElementById('roleName').value;
            const color = document.getElementById('roleColor').value;
            if (!name) {
                Swal.showValidationMessage('Enter role name');
            }
            return { name, color };
        }
    }).then(async (result) => {
        if (result.value) {
            await rolesRef.push({
                name: result.value.name,
                color: result.value.color,
                createdBy: currentUser.username,
                createdAt: Date.now()
            });
            Swal.fire('Success', 'Role created', 'success');
            loadRolesList();
        }
    });
}

async function editRole(roleId, oldName, oldColor) {
    const { value: formValues } = await Swal.fire({
        title: 'Edit Role',
        html: `
            <input id="roleName" class="swal2-input" value="${oldName}">
            <input id="roleColor" class="swal2-input" type="color" value="${oldColor}">
        `,
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
            const name = document.getElementById('roleName').value;
            const color = document.getElementById('roleColor').value;
            return { name, color };
        }
    });
    
    if (formValues) {
        await rolesRef.child(roleId).update({
            name: formValues.name,
            color: formValues.color
        });
        Swal.fire('Success', 'Role updated', 'success');
        loadRolesList();
    }
}

async function deleteRole(roleId) {
    const result = await Swal.fire({
        title: 'Delete Role?',
        text: 'This action cannot be undone',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
        await rolesRef.child(roleId).remove();
        Swal.fire('Deleted', 'Role deleted', 'success');
        loadRolesList();
    }
}

async function editChannel(channelId, oldName) {
    const { value: newName } = await Swal.fire({
        title: 'Edit Channel',
        input: 'text',
        inputValue: oldName,
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel'
    });
    
    if (newName) {
        await channelsRef.child(channelId).update({
            name: newName.toLowerCase().replace(/\s/g, '-'),
            displayName: newName
        });
        Swal.fire('Success', 'Channel updated', 'success');
        loadChannelsList();
        loadChannelsSidebar();
        updateChannelName();
    }
}

async function deleteChannel(channelId) {
    const result = await Swal.fire({
        title: 'Delete Channel?',
        text: 'All messages in this channel will be deleted',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
        await channelsRef.child(channelId).remove();
        await messagesRef.child(channelId).remove();
        Swal.fire('Deleted', 'Channel deleted', 'success');
        loadChannelsList();
        
        const snapshot = await channelsRef.once('value');
        let newChannelId = null;
        snapshot.forEach(child => {
            if (!newChannelId) {
                newChannelId = child.key;
            }
        });
        
        if (newChannelId) {
            await switchChannel(newChannelId);
        } else {
            currentChannelId = null;
            await loadChannelsSidebar();
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '<div class="loading-text">No channels available</div>';
            }
        }
    }
}
