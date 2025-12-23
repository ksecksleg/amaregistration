// Firebase Configuration
import { initializeApp as initFirebase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    serverTimestamp,
    query,
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase configuration
// IMPORTANT: Replace these with your actual Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyB1b2qUxwE6gZJd0XsfWTShrJkp1pqURMw",
  authDomain: "amaregistration.firebaseapp.com",
  projectId: "amaregistration",
  storageBucket: "amaregistration.firebasestorage.app",
  messagingSenderId: "609915541222",
  appId: "1:609915541222:web:6c04eb592ab1d43dcf4d27"
};

// Initialize Firebase
const app = initFirebase(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global variables
let membershipSignaturePad;
let idSignaturePad;
let currentUser = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    startApp();
    setupEventListeners();
    initializeSignaturePads();
    checkAuthState();
});

// Initialize application
function startApp() {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
    }, 1500);

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed'));
    }
}

// Setup event listeners
function setupEventListeners() {
    // Photo upload previews
    document.getElementById('photo-membership').addEventListener('change', (e) => {
        handlePhotoUpload(e, 'photo-preview-membership');
    });

    document.getElementById('photo-id').addEventListener('change', (e) => {
        handlePhotoUpload(e, 'photo-preview-id');
    });

    // Form submissions
    document.getElementById('membership-form').addEventListener('submit', (e) => {
        e.preventDefault();
        submitMembershipApplication();
    });

    document.getElementById('id-form').addEventListener('submit', (e) => {
        e.preventDefault();
        submitIDApplication();
    });

    // Admin login
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        adminLogin();
    });

    // Change password
    document.getElementById('change-password-form').addEventListener('submit', (e) => {
        e.preventDefault();
        changePassword();
    });

    // Photo preview click handlers
    document.getElementById('photo-preview-membership').addEventListener('click', () => {
        document.getElementById('photo-membership').click();
    });

    document.getElementById('photo-preview-id').addEventListener('click', () => {
        document.getElementById('photo-id').click();
    });

    // Close modal on overlay click
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') {
            closeModal();
        }
    });
}

// Initialize signature pads
function initializeSignaturePads() {
    const membershipCanvas = document.getElementById('signature-pad-membership');
    const idCanvas = document.getElementById('signature-pad-id');

    if (!membershipCanvas || !idCanvas) {
        console.error('Signature canvases not found!');
        return;
    }

    console.log('Membership canvas dimensions:', membershipCanvas.width, 'x', membershipCanvas.height);
    console.log('ID canvas dimensions:', idCanvas.width, 'x', idCanvas.height);

    membershipSignaturePad = createSignaturePad(membershipCanvas);
    idSignaturePad = createSignaturePad(idCanvas);
    
    console.log('Signature pads initialized successfully!');
}

// Create signature pad
function createSignaturePad(canvas) {
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = getCoordinates(e);
        container.classList.add('has-signature');
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();

        const [x, y] = getCoordinates(e);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        [lastX, lastY] = [x, y];
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        return [clientX - rect.left, clientY - rect.top];
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    return {
        clear: () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            container.classList.remove('has-signature');
        },
        isEmpty: () => {
            if (canvas.width === 0 || canvas.height === 0) {
                console.warn('Canvas has zero dimensions!');
                return true;
            }
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return !imageData.data.some(channel => channel !== 0);
        },
        toDataURL: () => canvas.toDataURL('image/png')
    };
}

// Clear signature
window.clearSignature = function(type) {
    if (type === 'membership') {
        membershipSignaturePad.clear();
    } else {
        idSignaturePad.clear();
    }
};

// Handle photo upload and preview
function handlePhotoUpload(event, previewId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById(previewId);
            preview.innerHTML = `<img src="${e.target.result}" alt="Photo Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

// Upload file to Firebase Storage
// Convert file to base64 (no Storage needed!)
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Compress image to fit Firestore 1MB limit
async function compressImage(file, maxSizeKB = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Resize if too large
                const maxDimension = 800;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Start with quality 0.7 and reduce if needed
                let quality = 0.7;
                let base64 = canvas.toDataURL('image/jpeg', quality);
                
                // Keep reducing quality until under size limit
                while (base64.length > maxSizeKB * 1024 && quality > 0.1) {
                    quality -= 0.1;
                    base64 = canvas.toDataURL('image/jpeg', quality);
                }
                
                console.log(`Compressed image: ${(base64.length / 1024).toFixed(2)}KB, quality: ${quality}`);
                resolve(base64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Convert signature canvas to base64 with WHITE background (not transparent/black)
function getSignatureWithWhiteBackground(sourceCanvas) {
    // Create a new canvas
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    
    const ctx = canvas.getContext('2d');
    
    // Fill with WHITE background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the signature on top
    ctx.drawImage(sourceCanvas, 0, 0);
    
    // Convert to JPEG (no transparency)
    return canvas.toDataURL('image/jpeg', 0.8);
}

// Submit Membership Application
async function submitMembershipApplication() {
    try {
        showToast('Processing application...', 'info');

        const form = document.getElementById('membership-form');
        const formData = new FormData(form);
        
        // Check signature
        if (membershipSignaturePad.isEmpty()) {
            showToast('Please provide your signature', 'error');
            return;
        }

        // Get photo file
        const photoFile = document.getElementById('photo-membership').files[0];
        if (!photoFile) {
            showToast('Please upload your photo', 'error');
            return;
        }

        // Validate file size (5MB max)
        if (photoFile.size > 5 * 1024 * 1024) {
            showToast('Photo file is too large. Maximum size is 5MB', 'error');
            return;
        }

        // Compress and convert photo to base64 (max 800KB to fit Firestore limit)
        showToast('Compressing photo...', 'info');
        const photoBase64 = await compressImage(photoFile, 700);

        // Convert signature to base64 with WHITE background (not transparent)
        const signatureCanvas = document.getElementById('signature-pad-membership');
        const signatureBase64 = getSignatureWithWhiteBackground(signatureCanvas);

        // Prepare data
        const applicationData = {
            type: 'membership',
            lastName: formData.get('lastName'),
            firstName: formData.get('firstName'),
            middleName: formData.get('middleName'),
            nickname: formData.get('nickname'),
            presentAddress: formData.get('presentAddress'),
            mobileNo: formData.get('mobileNo'),
            emailAddress: formData.get('emailAddress'),
            profession: formData.get('profession'),
            lineOfBusiness: formData.get('lineOfBusiness'),
            dateOfBirth: formData.get('dateOfBirth'),
            placeOfBirth: formData.get('placeOfBirth'),
            bloodType: formData.get('bloodType'),
            hobbies: formData.get('hobbies'),
            otherClubs: formData.get('otherClubs'),
            wifeLastName: formData.get('wifeLastName'),
            wifeFirstName: formData.get('wifeFirstName'),
            wifeMiddleName: formData.get('wifeMiddleName'),
            wifeNickname: formData.get('wifeNickname'),
            wifeProfession: formData.get('wifeProfession'),
            wifeMobileNo: formData.get('wifeMobileNo'),
            wifeDateOfBirth: formData.get('wifeDateOfBirth'),
            wifePlaceOfBirth: formData.get('wifePlaceOfBirth'),
            wifeHobbies: formData.get('wifeHobbies'),
            weddingAnniversary: formData.get('weddingAnniversary'),
            clubName: formData.get('clubName'),
            photoURL: photoBase64,
            signatureURL: signatureBase64,
            createdAt: serverTimestamp(),
            status: 'pending'
        };

        // Save to Firestore
        await addDoc(collection(db, 'membershipApplications'), applicationData);

        showToast('Application submitted successfully!', 'success');
        form.reset();
        document.getElementById('photo-preview-membership').innerHTML = '<span>Click to upload photo</span>';
        membershipSignaturePad.clear();

    } catch (error) {
        console.error('Error submitting application:', error);
        
        let errorMessage = 'Error submitting application. ';
        if (error.message && error.message.includes('longer than')) {
            errorMessage = 'Data too large. Try a smaller photo or compress it first.';
        } else if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Check Firestore security rules.';
        } else {
            errorMessage += error.message || 'Please try again.';
        }
        
        showToast(errorMessage, 'error');
    }
}

// Submit ID Application
async function submitIDApplication() {
    try {
        showToast('Processing application...', 'info');

        const form = document.getElementById('id-form');
        const formData = new FormData(form);
        
        // Check signature
        if (idSignaturePad.isEmpty()) {
            showToast('Please provide your signature', 'error');
            return;
        }

        // Get photo file
        const photoFile = document.getElementById('photo-id').files[0];
        if (!photoFile) {
            showToast('Please upload your photo', 'error');
            return;
        }

        // Validate file size (5MB max)
        if (photoFile.size > 5 * 1024 * 1024) {
            showToast('Photo file is too large. Maximum size is 5MB', 'error');
            return;
        }

        // Compress and convert photo to base64 (max 700KB to fit Firestore limit)
        showToast('Compressing photo...', 'info');
        const photoBase64 = await compressImage(photoFile, 700);

        // Convert signature to base64 with WHITE background
        const signatureCanvas = document.getElementById('signature-pad-id');
        const signatureBase64 = getSignatureWithWhiteBackground(signatureCanvas);

        // Prepare data
        const applicationData = {
            type: 'id',
            clubName: formData.get('clubNameId'),
            givenName: formData.get('givenName'),
            middleName: formData.get('middleNameId'),
            familyName: formData.get('familyName'),
            completeAddress: formData.get('completeAddress'),
            dateOfBirth: formData.get('dateOfBirthId'),
            contactPerson: formData.get('contactPerson'),
            contactNumber: formData.get('contactNumber'),
            photoURL: photoBase64,
            signatureURL: signatureBase64,
            createdAt: serverTimestamp(),
            status: 'pending'
        };

        // Save to Firestore
        await addDoc(collection(db, 'idApplications'), applicationData);

        showToast('Application submitted successfully!', 'success');
        form.reset();
        document.getElementById('photo-preview-id').innerHTML = '<span>Click to upload photo</span>';
        idSignaturePad.clear();

    } catch (error) {
        console.error('Error submitting application:', error);
        
        let errorMessage = 'Error submitting application. ';
        if (error.message && error.message.includes('longer than')) {
            errorMessage = 'Data too large. Try a smaller photo or compress it first.';
        } else if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Check Firestore security rules.';
        } else {
            errorMessage += error.message || 'Please try again.';
        }
        
        showToast(errorMessage, 'error');
    }
}

// Admin Login
async function adminLogin() {
    try {
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;

        await signInWithEmailAndPassword(auth, email, password);
        
        showToast('Login successful!', 'success');
        document.getElementById('admin-login').classList.remove('active');
        document.getElementById('admin-dashboard').classList.add('active');
        
        loadApplications();
        
    } catch (error) {
        console.error('Login error:', error);
        showToast('Invalid credentials. Please try again.', 'error');
    }
}

// Check auth state
function checkAuthState() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user && window.location.hash === '#admin') {
            document.getElementById('admin-login').classList.remove('active');
            document.getElementById('admin-dashboard').classList.add('active');
            loadApplications();
        }
    });
}

// Admin Logout
window.adminLogout = async function() {
    try {
        await auth.signOut();
        showToast('Logged out successfully', 'success');
        document.getElementById('admin-dashboard').classList.remove('active');
        document.getElementById('admin-login').classList.add('active');
        showPage('home');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    }
};

// Load applications
async function loadApplications() {
    await Promise.all([
        loadMembershipApplications(),
        loadIDApplications()
    ]);
}

// Load membership applications
async function loadMembershipApplications() {
    try {
        const tbody = document.getElementById('membership-table-body');
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">Loading data...</td></tr>';

        const q = query(collection(db, 'membershipApplications'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No applications found</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${data.photoURL}" alt="Photo"></td>
                <td>${data.firstName} ${data.lastName}</td>
                <td>${data.emailAddress}</td>
                <td>${data.mobileNo}</td>
                <td>${data.clubName || 'N/A'}</td>
                <td>${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                <td class="table-actions">
                    <button class="btn btn-primary btn-small" onclick="viewApplication('membership', '${doc.id}')">View</button>
                    <button class="btn btn-secondary btn-small" onclick="editApplication('membership', '${doc.id}')">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="deleteApplication('membership', '${doc.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading applications:', error);
        showToast('Error loading applications', 'error');
    }
}

// Load ID applications
async function loadIDApplications() {
    try {
        const tbody = document.getElementById('id-table-body');
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Loading data...</td></tr>';

        const q = query(collection(db, 'idApplications'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No applications found</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${data.photoURL}" alt="Photo"></td>
                <td>${data.givenName} ${data.familyName}</td>
                <td>${data.clubName}</td>
                <td>${data.contactPerson}</td>
                <td>${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                <td class="table-actions">
                    <button class="btn btn-primary btn-small" onclick="viewApplication('id', '${doc.id}')">View</button>
                    <button class="btn btn-secondary btn-small" onclick="editApplication('id', '${doc.id}')">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="deleteApplication('id', '${doc.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading applications:', error);
        showToast('Error loading applications', 'error');
    }
}

// View application
window.viewApplication = async function(type, id) {
                </div>
                <div class="detail-item" style="margin-top: 20px;">
                    <div class="detail-label">Complete Address</div>
                    <div class="detail-value">${data.completeAddress}</div>
                </div>
                <div class="detail-signature">
                    <div class="detail-label">Signature</div>
                    <img src="${data.signatureURL}" alt="Signature">
                </div>
            `;
        }

        document.getElementById('modal-overlay').classList.add('active');
        document.getElementById('view-modal').classList.add('active');

    } catch (error) {
        console.error('Error viewing application:', error);
        showToast('Error viewing application', 'error');
    }
};

// Edit application
window.editApplication = async function(type, id) {
    try {
        const collectionName = type === 'membership' ? 'membershipApplications' : 'idApplications';
        const docRef = doc(db, collectionName, id);
        const docSnap = await (await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')).getDoc(docRef);

        if (!docSnap.exists()) {
            showToast('Application not found', 'error');
            return;
        }

        const data = docSnap.data();
        const modalBody = document.getElementById('edit-modal-body');

        // Create edit form based on type
        let formHTML = `<form id="edit-form" onsubmit="saveEdit('${type}', '${id}', event)">`;

        if (type === 'membership') {
            formHTML += `
                <div class="form-row">
                    <div class="form-group">
                        <label>First Name</label>
                        <input type="text" name="firstName" value="${data.firstName}" required>
                    </div>
                    <div class="form-group">
                        <label>Middle Name</label>
                        <input type="text" name="middleName" value="${data.middleName || ''}">
                    </div>
                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" name="lastName" value="${data.lastName}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="emailAddress" value="${data.emailAddress}" required>
                    </div>
                    <div class="form-group">
                        <label>Mobile</label>
                        <input type="tel" name="mobileNo" value="${data.mobileNo}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Profession</label>
                        <input type="text" name="profession" value="${data.profession}" required>
                    </div>
                    <div class="form-group">
                        <label>Club Name</label>
                        <input type="text" name="clubName" value="${data.clubName || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <textarea name="presentAddress" rows="2" required>${data.presentAddress}</textarea>
                </div>
            `;
        } else {
            formHTML += `
                <div class="form-row">
                    <div class="form-group">
                        <label>Given Name</label>
                        <input type="text" name="givenName" value="${data.givenName}" required>
                    </div>
                    <div class="form-group">
                        <label>Middle Name</label>
                        <input type="text" name="middleName" value="${data.middleName || ''}">
                    </div>
                    <div class="form-group">
                        <label>Family Name</label>
                        <input type="text" name="familyName" value="${data.familyName}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Club Name</label>
                        <input type="text" name="clubName" value="${data.clubName}" required>
                    </div>
                    <div class="form-group">
                        <label>Contact Person</label>
                        <input type="text" name="contactPerson" value="${data.contactPerson}" required>
                    </div>
                    <div class="form-group">
                        <label>Contact Number</label>
                        <input type="tel" name="contactNumber" value="${data.contactNumber}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Complete Address</label>
                    <textarea name="completeAddress" rows="2" required>${data.completeAddress}</textarea>
                </div>
            `;
        }

        formHTML += `
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>`;

        modalBody.innerHTML = formHTML;
        document.getElementById('modal-overlay').classList.add('active');
        document.getElementById('edit-modal').classList.add('active');

    } catch (error) {
        console.error('Error editing application:', error);
        showToast('Error editing application', 'error');
    }
};

// Save edit
window.saveEdit = async function(type, id, event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        const updateData = {};

        for (let [key, value] of formData.entries()) {
            updateData[key] = value;
        }

        const collectionName = type === 'membership' ? 'membershipApplications' : 'idApplications';
        const docRef = doc(db, collectionName, id);
        
        await updateDoc(docRef, updateData);

        showToast('Application updated successfully!', 'success');
        closeModal();
        loadApplications();

    } catch (error) {
        console.error('Error updating application:', error);
        showToast('Error updating application', 'error');
    }
};

// Delete application
window.deleteApplication = async function(type, id) {
    if (!confirm('Are you sure you want to delete this application?')) {
        return;
    }

    try {
        const collectionName = type === 'membership' ? 'membershipApplications' : 'idApplications';
        await deleteDoc(doc(db, collectionName, id));

        showToast('Application deleted successfully!', 'success');
        loadApplications();

    } catch (error) {
        console.error('Error deleting application:', error);
        showToast('Error deleting application', 'error');
    }
};

// Change password
async function changePassword() {
    try {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);

        showToast('Password updated successfully!', 'success');
        closeModal();
        document.getElementById('change-password-form').reset();

    } catch (error) {
        console.error('Error changing password:', error);
        if (error.code === 'auth/wrong-password') {
            showToast('Current password is incorrect', 'error');
        } else {
            showToast('Error changing password', 'error');
        }
    }
}

// Show change password modal
window.showChangePassword = function() {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('password-modal').classList.add('active');
};

// Close modal
window.closeModal = function() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
};

// Show page
window.showPage = function(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');
    window.scrollTo(0, 0);

    // Update URL hash
    window.location.hash = pageName;
};

// Switch form
window.switchForm = function(formType) {
    document.querySelectorAll('.application-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`${formType}-form`).classList.add('active');

    document.querySelectorAll('.form-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
};

// Switch dashboard
window.switchDashboard = function(dashboardType) {
    document.querySelectorAll('.dashboard-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${dashboardType}-dashboard`).classList.add('active');

    document.querySelectorAll('.dashboard-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
};

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Handle URL hash on load
window.addEventListener('load', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        showPage(hash);
    }
});

// Export to Excel function
window.exportToExcel = async function(type) {
    try {
        showToast('Preparing Excel file...', 'info');
        
        const collectionName = type === 'membership' ? 'membershipApplications' : 'idApplications';
        const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            showToast('No data to export', 'warning');
            return;
        }
        
        const data = [];
        querySnapshot.forEach((doc) => {
            const d = doc.data();
            if (type === 'membership') {
                data.push({
                    'Date Applied': d.createdAt ? new Date(d.createdAt.toDate()).toLocaleDateString() : '',
                    'Last Name': d.lastName || '',
                    'First Name': d.firstName || '',
                    'Middle Name': d.middleName || '',
                    'Nickname': d.nickname || '',
                    'Email': d.emailAddress || '',
                    'Mobile': d.mobileNo || '',
                    'Address': d.presentAddress || '',
                    'Date of Birth': d.dateOfBirth || '',
                    'Place of Birth': d.placeOfBirth || '',
                    'Blood Type': d.bloodType || '',
                    'Profession': d.profession || '',
                    'Line of Business': d.lineOfBusiness || '',
                    'Hobbies & Sports': d.hobbies || '',
                    'Other Clubs': d.otherClubs || '',
                    'Club Name': d.clubName || '',
                    'Wife Name': d.wifeFirstName ? `${d.wifeFirstName} ${d.wifeLastName}` : '',
                    'Wife Profession': d.wifeProfession || '',
                    'Wife Mobile': d.wifeMobileNo || '',
                    'Wedding Anniversary': d.weddingAnniversary || '',
                    'Status': d.status || 'pending'
                });
            } else {
                data.push({
                    'Date Applied': d.createdAt ? new Date(d.createdAt.toDate()).toLocaleDateString() : '',
                    'Club Name': d.clubName || '',
                    'Given Name': d.givenName || '',
                    'Middle Name': d.middleName || '',
                    'Family Name': d.familyName || '',
                    'Complete Address': d.completeAddress || '',
                    'Date of Birth': d.dateOfBirth || '',
                    'Contact Person': d.contactPerson || '',
                    'Contact Number': d.contactNumber || '',
                    'Status': d.status || 'pending'
                });
            }
        });
        
        // Create workbook
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, type === 'membership' ? 'Membership' : 'ID Applications');
        
        // Generate filename with date
        const filename = `Eagles_${type}_Applications_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Download
        XLSX.writeFile(wb, filename);
        
        showToast('Excel file downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showToast('Error exporting to Excel', 'error');
    }
};

// View application in formatted PDF-style layout
async function showFormattedView(type, id) {
    try {
        const collectionName = type === 'membership' ? 'membershipApplications' : 'idApplications';
        const docRef = doc(db, collectionName, id);
        const docModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const docSnap = await docModule.getDoc(docRef);

        if (!docSnap.exists()) {
            showToast('Application not found', 'error');
            return;
        }

        const data = docSnap.data();
        const modalBody = document.getElementById('view-modal-body');

        if (type === 'membership') {
            modalBody.innerHTML = `
                <div class="pdf-view">
                    <div class="pdf-header">
                        <img src="/logo.png" alt="Philippine Flag" style="width: 80px; float: left; margin-right: 20px;">
                        <div style="text-align: center; padding-top: 10px;">
                            <h2 style="color: #d4af37; margin: 0;">THE FRATERNAL ORDER OF <em>Eagles</em></h2>
                            <h3 style="margin: 5px 0;">(Philippine <em>Eagles</em>)</h3>
                            <p style="margin: 3px 0; font-size: 0.9em;">First Philippine-Born Socio-Civic Organization</p>
                            <p style="margin: 3px 0; color: #d4af37; font-style: italic;"><strong>Service Through Strong Brotherhood</strong></p>
                            <p style="margin: 3px 0; font-size: 1.1em; font-style: italic;"><strong>"ANG MALAYANG AGILA"</strong></p>
                        </div>
                        <img src="/logo.png" alt="Eagles Logo" style="width: 80px; float: right; margin-left: 20px;">
                        <div style="clear: both;"></div>
                    </div>
                    
                    <h3 style="text-align: center; margin: 20px 0; text-decoration: underline;">APPLICATION OF MEMBERSHIP</h3>
                    
                    <div class="pdf-photo" style="float: right; width: 120px; height: 120px; border: 2px solid #000; margin: 0 0 10px 10px;">
                        <img src="${data.photoURL}" alt="Photo" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    
                    <p style="margin: 10px 0;"><strong>Date:</strong> ${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : ''}</p>
                    
                    <div style="clear: both; margin-top: 20px;">
                        <p style="text-align: justify; line-height: 1.6; margin-bottom: 20px;">
                            I hereby submit my application to your Eagles Club, subject to the criteria, qualifications, and requirements
                            prescribed by the Eagles Magna Carta of 1989 as amended, as well as to such other requirements as shall be
                            prescribed, from time to time, by the Philippine Eagles. It is a pre-condition to this application that I shall strictly
                            abide by the said Constitution and By-Laws and by such other rules, regulations, and policies that may be
                            promulgated from time to time.
                        </p>
                    </div>
                    
                    <table class="pdf-table" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td colspan="2" style="border-bottom: 2px solid #000; padding: 10px 0; text-align: center;">
                                <strong>Name of Eagles Club</strong>
                            </td>
                            <td colspan="2" style="border-bottom: 2px solid #000; padding: 10px 0; text-align: center;">
                                <strong>Applicant's Name & Signature</strong>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="4" style="padding: 10px 0;">
                                <strong>Name:</strong> 
                                <span style="border-bottom: 1px solid #000; display: inline-block; min-width: 200px; padding: 2px 10px;">
                                    ${data.lastName || ''}, ${data.firstName || ''} ${data.middleName || ''} (${data.nickname || ''})
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="4" style="padding: 5px 0;"><strong>Present Address:</strong> ${data.presentAddress || ''}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0;"><strong>Mobile No.:</strong> ${data.mobileNo || ''}</td>
                            <td colspan="3" style="padding: 5px 0;"><strong>Email Address:</strong> ${data.emailAddress || ''}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0;"><strong>Profession:</strong> ${data.profession || ''}</td>
                            <td colspan="3" style="padding: 5px 0;"><strong>Line of Business:</strong> ${data.lineOfBusiness || ''}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0;"><strong>Date of Birth:</strong> ${data.dateOfBirth || ''}</td>
                            <td style="padding: 5px 0;"><strong>Place of Birth:</strong> ${data.placeOfBirth || ''}</td>
                            <td colspan="2" style="padding: 5px 0;"><strong>Blood Type:</strong> ${data.bloodType || ''}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 5px 0;"><strong>Hobbies & Sports:</strong> ${data.hobbies || ''}</td>
                            <td colspan="2" style="padding: 5px 0;"><strong>Other Club Affiliations:</strong> ${data.otherClubs || ''}</td>
                        </tr>
                        ${data.wifeFirstName ? `
                        <tr><td colspan="4" style="padding-top: 20px;"><strong>SPOUSE INFORMATION</strong></td></tr>
                        <tr>
                            <td colspan="4" style="padding: 5px 0;">
                                <strong>Name of Wife:</strong> ${data.wifeLastName || ''}, ${data.wifeFirstName || ''} ${data.wifeMiddleName || ''} (${data.wifeNickname || ''})
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0;"><strong>Profession:</strong> ${data.wifeProfession || ''}</td>
                            <td colspan="3" style="padding: 5px 0;"><strong>Mobile No.:</strong> ${data.wifeMobileNo || ''}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0;"><strong>Date of Birth:</strong> ${data.wifeDateOfBirth || ''}</td>
                            <td style="padding: 5px 0;"><strong>Place of Birth:</strong> ${data.wifePlaceOfBirth || ''}</td>
                            <td colspan="2" style="padding: 5px 0;"><strong>Hobbies & Sports:</strong> ${data.wifeHobbies || ''}</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="padding: 5px 0;"><strong>Wedding Anniversary:</strong> ${data.weddingAnniversary || ''}</td>
                        </tr>
                        ` : ''}
                    </table>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <p><strong>SIGNATURE</strong></p>
                        <img src="${data.signatureURL}" alt="Signature" style="max-width: 300px; border: 1px solid #ccc; background: white;">
                    </div>
                </div>
            `;
        } else {
            // ID APPLICATION FORMAT
            modalBody.innerHTML = `
                <div class="pdf-view">
                    <div class="pdf-header">
                        <img src="/logo.png" alt="Philippine Flag" style="width: 80px; float: left; margin-right: 20px;">
                        <div style="text-align: center; padding-top: 10px;">
                            <h2 style="color: #d4af37; margin: 0;">THE FRATERNAL ORDER OF <em>Eagles</em></h2>
                            <h3 style="margin: 5px 0;">(Philippine <em>Eagles</em>)</h3>
                            <p style="margin: 3px 0; font-size: 0.9em;">First Philippine-Born Socio-Civic Organization</p>
                            <p style="margin: 3px 0; color: #d4af37; font-style: italic;"><strong>Service Through Strong Brotherhood</strong></p>
                            <p style="margin: 3px 0; font-size: 1.1em; font-style: italic;"><strong>"ANG MALAYANG AGILA"</strong></p>
                        </div>
                        <img src="/logo.png" alt="Eagles Logo" style="width: 80px; float: right; margin-left: 20px;">
                        <div style="clear: both;"></div>
                    </div>
                    
                    <hr style="border: 1px dashed #000; margin: 20px 0;">
                    
                    <h3 style="text-align: center; margin: 20px 0;">APPLICATION FOR IDENTIFICATION CARD</h3>
                    
                    <div class="pdf-photo" style="float: right; width: 120px; height: 120px; border: 2px solid #000; margin: 0 0 10px 10px;">
                        <img src="${data.photoURL}" alt="2x2 picture" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    
                    <table class="pdf-table" style="width: 100%; border: 2px solid #000; border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td colspan="2" style="border: 1px solid #000; padding: 10px; text-align: center; background: #f0f0f0;">
                                <strong>Name of Club</strong>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" style="border: 1px solid #000; padding: 10px; text-align: center;">
                                ${data.clubName || ''}
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" style="border: 1px solid #000; padding: 10px; text-align: center; background: #f0f0f0;">
                                <strong>ID Number</strong> (to be filled up by the Nat'l Secretariat)
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;"><strong>Given Name</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${data.givenName || ''}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;"><strong>Middle Name</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${data.middleName || ''}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;"><strong>Family Name</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${data.familyName || ''}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;"><strong>Complete Address</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${data.completeAddress || ''}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;"><strong>Date of Birth</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${data.dateOfBirth || ''}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;"><strong>Contact Person</strong><br>(in case of emergency)</td>
                            <td style="border: 1px solid #000; padding: 10px;">${data.contactPerson || ''}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;"><strong>Contact Number</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${data.contactNumber || ''}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;"><strong>Member's Signature</strong><br>(Please sign inside the box)</td>
                            <td style="border: 1px solid #000; padding: 10px; height: 150px; vertical-align: middle; text-align: center;">
                                <img src="${data.signatureURL}" alt="Signature" style="max-width: 250px; max-height: 130px; background: white;">
                            </td>
                        </tr>
                    </table>
                </div>
            `;
        }

        // Add print and download PDF buttons
        modalBody.innerHTML += `
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
                <button class="btn btn-primary" onclick="window.print()">🖨️ Print</button>
                <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            </div>
        `;

        document.getElementById('modal-overlay').classList.add('active');
        document.getElementById('view-modal').classList.add('active');

    } catch (error) {
        console.error('Error viewing application:', error);
        showToast('Error viewing application', 'error');
    }
}
