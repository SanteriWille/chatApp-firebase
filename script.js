// Vent til DOM er fullstendig lastet før vi initialiserer applikasjonen
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Import the functions you need from the SDKs you need
  import("https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js")
    .then((firebaseApp) => {
      const { initializeApp } = firebaseApp;

      // Importerer Auth-modulen
      return Promise.all([
        import("https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"),
        initializeApp
      ]);
    })
    .then(([firebaseAuth, firebaseFirestore, initializeApp]) => {
      const { 
        getAuth, 
        createUserWithEmailAndPassword, 
        signInWithEmailAndPassword, 
        signOut, 
        onAuthStateChanged, 
        updateProfile 
      } = firebaseAuth;

      const { 
        getFirestore, 
        collection, 
        addDoc, 
        serverTimestamp, 
        onSnapshot, 
        query, 
        orderBy, 
        doc, 
        deleteDoc, 
        updateDoc 
      } = firebaseFirestore;

      // Your web app's Firebase configuration
      const firebaseConfig = {
        apiKey: "AIzaSyCQI1T8ddI5It4LRA_Fv4_oldNsE0VcMRo",
        authDomain: "chatapp-3c88d.firebaseapp.com",
        projectId: "chatapp-3c88d",
        storageBucket: "chatapp-3c88d.firebasestorage.app",
        messagingSenderId: "158459835348",
        appId: "1:158459835348:web:87045a02c176b1b9931c41"
      };

      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      // DOM Elements - med null-sjekk
      const authContainer = document.getElementById('auth-container');
      const chatContainer = document.getElementById('chat-container');
      const signinBtn = document.getElementById('signinBtn');
      const loginBtn = document.getElementById('loginBtn');
      const logoutBtn = document.getElementById('logoutBtn');
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const displayNameInput = document.getElementById('displayName');
      const currentUserDisplay = document.getElementById('currentUser');
      const messagesContainer = document.getElementById('messages-container');
      const messageInput = document.getElementById('messageInput');
      const sendBtn = document.getElementById('sendBtn');
      const toggleThemeBtn = document.getElementById('toggleTheme');

      // Validerer at DOM-elementer eksisterer
      if (!validateDOMElements([
        { element: authContainer, name: 'authContainer' },
        { element: chatContainer, name: 'chatContainer' },
        { element: signinBtn, name: 'signinBtn' },
        { element: loginBtn, name: 'loginBtn' },
        { element: emailInput, name: 'emailInput' },
        { element: passwordInput, name: 'passwordInput' }
      ])) {
        console.error("Kritiske DOM-elementer mangler. Applikasjonen kan ikke initialiseres.");
        return;
      }

      // Sjekke om dark mode er aktivert fra localStorage
      if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        if (toggleThemeBtn) toggleThemeBtn.textContent = '☀️';
      }

      // Event listeners - med null-sjekk
      if (signinBtn) signinBtn.addEventListener("click", registerUser);
      if (loginBtn) loginBtn.addEventListener("click", loginUser);
      if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
      if (sendBtn) sendBtn.addEventListener("click", sendMessage);
      if (toggleThemeBtn) toggleThemeBtn.addEventListener("click", toggleDarkMode);

      // Enter-tast for å sende melding
      if (messageInput) {
        messageInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            sendMessage();
          }
        });
      }

      // Authentication state observer
      onAuthStateChanged(auth, (user) => {
        if (user) {
          // Bruker er logget inn
          if (authContainer) authContainer.classList.add('hidden');
          if (chatContainer) chatContainer.classList.remove('hidden');
          
          // Vis brukernavn eller e-post
          if (currentUserDisplay) {
            const displayName = user.displayName || user.email.split('@')[0];
            currentUserDisplay.textContent = displayName;
          }
          
          // Last inn meldinger
          loadMessages();
        } else {
          // Bruker er logget ut
          if (authContainer) authContainer.classList.remove('hidden');
          if (chatContainer) chatContainer.classList.add('hidden');
          
          // Tøm input-feltene hvis de eksisterer
          if (emailInput) emailInput.value = '';
          if (passwordInput) passwordInput.value = '';
          if (displayNameInput) displayNameInput.value = '';
        }
      });

      // Brukerregistrering
      async function registerUser() {
        // Sjekk at nødvendige elementer eksisterer
        if (!emailInput || !passwordInput) {
          alert("Kan ikke registrere bruker: Input-felt mangler");
          return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const displayName = displayNameInput ? displayNameInput.value.trim() : '';
        
        if (!email || !password) {
          alert("Vennligst fyll inn både e-post og passord");
          return;
        }
        
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          
          // Sett visningsnavn hvis oppgitt
          if (displayName) {
            await updateProfile(user, {
              displayName: displayName
            });
          }
          
          alert("Bruker registrert og logget inn!");
        } catch (error) {
          alert(`Registreringsfeil: ${error.message}`);
        }
      }

      // Brukerinnlogging
      async function loginUser() {
        // Sjekk at nødvendige elementer eksisterer
        if (!emailInput || !passwordInput) {
          alert("Kan ikke logge inn: Input-felt mangler");
          return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
          alert("Vennligst fyll inn både e-post og passord");
          return;
        }
        
        try {
          await signInWithEmailAndPassword(auth, email, password);
          // Håndteres av onAuthStateChanged
        } catch (error) {
          alert(`Innloggingsfeil: ${error.message}`);
        }
      }

      // Utlogging
      async function logoutUser() {
        try {
          await signOut(auth);
          // Håndteres av onAuthStateChanged
        } catch (error) {
          alert(`Utloggingsfeil: ${error.message}`);
        }
      }

      // Last inn meldinger fra Firestore
      function loadMessages() {
        // Sjekk at messagesContainer og db er tilgjengelig
        if (!messagesContainer || !db) {
          console.error("Kan ikke laste meldinger: messagesContainer eller db mangler");
          return;
        }
        
        const messagesRef = collection(db, "messages");
        const q = query(messagesRef, orderBy("timestamp", "asc"));
        
        // Sanntids lytter for meldinger
        onSnapshot(q, (querySnapshot) => {
          messagesContainer.innerHTML = '';
          
          querySnapshot.forEach((doc) => {
            const message = doc.data();
            const messageId = doc.id;
            displayMessage(message, messageId);
          });
          
          // Scroll til bunnen av meldingsvinduet
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
      }

      // Vis en melding i UI
      function displayMessage(message, messageId) {
        // Sjekk at messagesContainer og auth.currentUser er tilgjengelig
        if (!messagesContainer || !auth.currentUser) {
          console.error("Kan ikke vise melding: messagesContainer eller auth.currentUser mangler");
          return;
        }
        
        const messageElement = document.createElement("div");
        const currentUser = auth.currentUser;
        const isCurrentUser = message.userId === currentUser.uid;
        
        messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
        messageElement.id = `message-${messageId}`;
        
        // Formatere tidsstempel
        const timestamp = message.timestamp ? new Date(message.timestamp.toDate()) : new Date();
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = timestamp.toLocaleDateString();
        
        messageElement.innerHTML = `
          <div class="message-content">${message.text}</div>
          <div class="message-info">
            <span>${message.userName}</span>
            <span class="timestamp">${dateString} ${timeString}</span>
          </div>
        `;
        
        // Legg til slett/rediger-knapper for brukerens egne meldinger
        if (isCurrentUser) {
          const actionsDiv = document.createElement("div");
          actionsDiv.className = "message-actions";
          
          const editBtn = document.createElement("button");
          editBtn.className = "edit-btn";
          editBtn.textContent = "Rediger";
          editBtn.addEventListener("click", () => editMessage(messageId, message.text));
          
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "delete-btn";
          deleteBtn.textContent = "Slett";
          deleteBtn.addEventListener("click", () => deleteMessage(messageId));
          
          actionsDiv.appendChild(editBtn);
          actionsDiv.appendChild(deleteBtn);
          messageElement.appendChild(actionsDiv);
        }
        
        messagesContainer.appendChild(messageElement);
      }

      // Send en melding
      async function sendMessage() {
        // Sjekk at nødvendige elementer og auth.currentUser er tilgjengelig
        if (!messageInput || !auth.currentUser || !db) {
          console.error("Kan ikke sende melding: messageInput, auth.currentUser eller db mangler");
          return;
        }
        
        const messageText = messageInput.value.trim();
        const user = auth.currentUser;
        
        if (!messageText) {
          return; // Ikke send tomme meldinger
        }
        
        try {
          await addDoc(collection(db, "messages"), {
            text: messageText,
            userId: user.uid,
            userName: user.displayName || user.email.split('@')[0],
            timestamp: serverTimestamp()
          });
          
          // Tøm input-feltet
          messageInput.value = '';
        } catch (error) {
          alert(`Error sending message: ${error.message}`);
        }
      }

      // Slett melding
      async function deleteMessage(messageId) {
        // Sjekk at db er tilgjengelig
        if (!db) {
          console.error("Kan ikke slette melding: db mangler");
          return;
        }
        
        if (confirm("Er du sikker på at du vil slette denne meldingen?")) {
          try {
            await deleteDoc(doc(db, "messages", messageId));
          } catch (error) {
            alert(`Error deleting message: ${error.message}`);
          }
        }
      }

      // Rediger melding
      function editMessage(messageId, currentText) {
        // Sjekk at nødvendige elementer er tilgjengelige
        const messageElement = document.getElementById(`message-${messageId}`);
        if (!messageElement || !db) {
          console.error("Kan ikke redigere melding: messageElement eller db mangler");
          return;
        }
        
        const messageContent = messageElement.querySelector('.message-content');
        if (!messageContent) {
          console.error("Kan ikke redigere melding: messageContent ikke funnet");
          return;
        }
        
        // Create editing interface
        const editingDiv = document.createElement('div');
        editingDiv.className = 'editing-message';
        
        const editInput = document.createElement('input');
        editInput.className = 'editing-input';
        editInput.value = currentText;
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-btn';
        saveBtn.textContent = 'Lagre';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-btn';
        cancelBtn.textContent = 'Avbryt';
        
        editingDiv.appendChild(editInput);
        editingDiv.appendChild(saveBtn);
        editingDiv.appendChild(cancelBtn);
        
        // Replace content with editing interface
        messageContent.innerHTML = '';
        messageContent.appendChild(editingDiv);
        
        // Focus the input
        editInput.focus();
        
        // Set up event listeners
        saveBtn.addEventListener('click', async () => {
          updateMessageText(messageId, editInput.value.trim(), currentText, messageContent);
        });
        
        cancelBtn.addEventListener('click', () => {
          messageContent.textContent = currentText;
        });
        
        // Handle Enter key to save
        editInput.addEventListener('keypress', async (e) => {
          if (e.key === 'Enter') {
            updateMessageText(messageId, editInput.value.trim(), currentText, messageContent);
          }
        });
      }
      
      // Helper for oppdatering av meldingstekst
      async function updateMessageText(messageId, newText, currentText, messageContent) {
        if (!newText || !db) {
          messageContent.textContent = currentText;
          return;
        }
        
        try {
          await updateDoc(doc(db, "messages", messageId), {
            text: newText
          });
          messageContent.textContent = newText;
        } catch (error) {
          alert(`Error updating message: ${error.message}`);
          messageContent.textContent = currentText;
        }
      }

      // Toggle dark mode
      function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
          if (toggleThemeBtn) toggleThemeBtn.textContent = '☀️';
          localStorage.setItem('darkMode', 'enabled');
        } else {
          if (toggleThemeBtn) toggleThemeBtn.textContent = '🌙';
          localStorage.setItem('darkMode', 'disabled');
        }
      }
      
      // Hjelpefunksjon for å validere DOM-elementer
      function validateDOMElements(elements) {
        let allValid = true;
        
        elements.forEach(item => {
          if (!item.element) {
            console.error(`DOM element '${item.name}' ble ikke funnet`);
            allValid = false;
          }
        });
        
        return allValid;
      }
    })
    .catch(error => {
      console.error("Feil ved lasting av Firebase-moduler:", error);
      alert("Kunne ikke laste Firebase. Sjekk internettforbindelsen og prøv igjen.");
    });
}