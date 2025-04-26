class AlarmManager {
    constructor() {
        console.log('Initializing AlarmManager');
        try {
            this.alarms = JSON.parse(localStorage.getItem('alarms')) || [];
            this.chatMessages = document.getElementById('chatMessages');
            this.userInput = document.getElementById('userInput');
            this.sendButton = document.getElementById('sendButton');
            this.voiceButton = document.getElementById('voiceButton');
            this.voiceStatus = document.getElementById('voiceStatus');
            this.alarmsList = document.getElementById('alarmsList');
            this.alarmSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            this.alarmSound.loop = true;
            
            // Speech recognition setup
            this.recognition = null;
            this.isListening = false;
            this.setupSpeechRecognition();

            this.setupEventListeners();
            this.updateAlarmsList();
            this.startAlarmChecker();
            
            console.log('AlarmManager initialized with:', {
                alarms: this.alarms,
                chatMessages: this.chatMessages,
                userInput: this.userInput,
                sendButton: this.sendButton,
                voiceButton: this.voiceButton,
                voiceStatus: this.voiceStatus,
                alarmsList: this.alarmsList
            });
        } catch (error) {
            console.error('Error in AlarmManager constructor:', error);
            throw error;
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        try {
            // Send button click handler
            this.sendButton.addEventListener('click', () => {
                console.log('Send button clicked');
                this.handleUserInput();
            });
            
            // Enter key handler
            this.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enter key pressed');
                    this.handleUserInput();
                }
            });
            
            // Voice button click handler
            this.voiceButton.addEventListener('click', () => {
                console.log('Voice button clicked');
                this.toggleVoiceRecognition();
            });
            
            console.log('Event listeners setup complete');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            throw error;
        }
    }
    
    setupSpeechRecognition() {
        console.log('Setting up speech recognition...');
        // Check if browser supports speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            console.log('Speech recognition is supported in this browser');
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Configure recognition
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            // Set up event handlers
            this.recognition.onstart = () => {
                console.log('Speech recognition started');
                this.isListening = true;
                this.voiceButton.classList.add('listening');
                this.voiceStatus.textContent = 'Listening...';
                this.addMessage('Listening for your command...', 'bot');
            };
            
            this.recognition.onend = () => {
                console.log('Speech recognition ended');
                this.isListening = false;
                this.voiceButton.classList.remove('listening');
                this.voiceStatus.textContent = '';
            };
            
            this.recognition.onresult = (event) => {
                console.log('Speech recognition result:', event.results);
                const command = event.results[0][0].transcript;
                console.log('Recognized command:', command);
                
                // Add the voice command to chat messages
                this.addMessage(`You said: ${command}`, 'user');
                
                // Process the command
                this.processVoiceCommand(command);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.voiceStatus.textContent = `Error: ${event.error}`;
                this.voiceButton.classList.remove('listening');
                this.isListening = false;
                
                // Add error message to chat
                this.addMessage(`Sorry, there was an error with voice recognition: ${event.error}. Please try again or type your command.`, 'bot');
                
                setTimeout(() => {
                    this.voiceStatus.textContent = '';
                }, 3000);
            };
        } else {
            // Browser doesn't support speech recognition
            console.error('Speech recognition not supported in this browser');
            this.voiceButton.style.display = 'none';
            this.addMessage("Sorry, voice recognition is not supported in your browser. Please type your commands instead.", 'bot');
        }
    }
    
    toggleVoiceRecognition() {
        console.log('Toggling voice recognition, isListening:', this.isListening);
        if (!this.recognition) {
            console.error('Recognition not initialized');
            this.addMessage("Sorry, voice recognition is not initialized. Please refresh the page and try again.", 'bot');
            return;
        }
        
        if (this.isListening) {
            console.log('Stopping recognition');
            this.recognition.stop();
        } else {
            console.log('Starting recognition');
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error starting recognition:', error);
                this.addMessage("Sorry, there was an error starting voice recognition. Please try again.", 'bot');
            }
        }
    }

    startAlarmChecker() {
        setInterval(() => {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            this.alarms.forEach(alarm => {
                // Check if the alarm time matches and it's not already ringing
                if (alarm.time === currentTime && !alarm.isRinging) {
                    // If the alarm has a specific date, check if it matches today
                    if (alarm.date) {
                        if (alarm.date === currentDate) {
                            console.log('Triggering date-specific alarm at:', currentTime, alarm);
                            this.triggerAlarm(alarm);
                            this.saveAlarms();
                        }
                    } else {
                        // For regular alarms without a specific date
                        console.log('Triggering alarm at:', currentTime, alarm);
                        this.triggerAlarm(alarm);
                        this.saveAlarms();
                    }
                }
            });
        }, 1000); // Check every second
    }

    triggerAlarm(alarm) {
        console.log('Triggering alarm:', alarm);
        alarm.isRinging = true;
        this.alarmSound.play();
        
        // Create notification
        if (Notification.permission === "granted") {
            new Notification("Alarm!", {
                body: `Time for: ${alarm.description}`,
                icon: "https://cdn-icons-png.flaticon.com/512/1828/1828640.png"
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("Alarm!", {
                        body: `Time for: ${alarm.description}`,
                        icon: "https://cdn-icons-png.flaticon.com/512/1828/1828640.png"
                    });
                }
            });
        }

        // Add stop alarm button to chat
        const stopButton = document.createElement('button');
        stopButton.className = 'stop-alarm-button';
        stopButton.innerHTML = `<i class="fas fa-stop"></i> Stop Alarm`;
        stopButton.onclick = () => {
            console.log('Stop button clicked for alarm:', alarm);
            this.stopAlarm(alarm);
        };
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot alarm-message';
        messageDiv.innerHTML = `🔔 ALARM: ${alarm.description} at ${alarm.time}`;
        messageDiv.appendChild(stopButton);
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        // Save the ringing state
        this.saveAlarms();
    }

    stopAlarm(alarm) {
        console.log('Stopping alarm:', alarm);
        
        // Stop the alarm sound
        try {
            this.alarmSound.pause();
            this.alarmSound.currentTime = 0;
            this.alarmSound.loop = false;
            this.alarmSound.src = this.alarmSound.src; // Reset the audio source
        } catch (error) {
            console.error('Error stopping alarm sound:', error);
        }
        
        // Update alarm state and remove from alarms list
        alarm.isRinging = false;
        this.alarms = this.alarms.filter(a => a.id !== alarm.id); // Remove the alarm completely
        this.saveAlarms();
        
        // Remove all alarm-related messages
        const alarmMessages = document.querySelectorAll('.alarm-message');
        alarmMessages.forEach(msg => {
            if (msg.textContent.includes(alarm.time)) {
                msg.remove();
            }
        });

        // Add a confirmation message
        this.addMessage(`Alarm stopped and removed: ${alarm.description} at ${alarm.time}`, 'bot');
        
        // Update the alarms list to reflect the stopped state
        this.updateAlarmsList();
    }

    handleUserInput() {
        const message = this.userInput.value.trim();
        if (!message) return;

        console.log('Handling user input:', message);
        this.addMessage(message, 'user');
        this.processUserMessage(message);
        this.userInput.value = '';
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.textContent = text;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    processUserMessage(message) {
        console.log('Processing user message:', message);
        const lowerMessage = message.toLowerCase();

        // Check if the message is related to alarms
        if (this.isAlarmRelated(lowerMessage)) {
            console.log('Message is alarm related');
            if (lowerMessage.includes('create') || lowerMessage.includes('set') || lowerMessage.includes('add')) {
                console.log('Handling create alarm command');
                this.handleCreateAlarm(message);
            } else if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
                this.handleDeleteAlarm(message);
            } else if (lowerMessage.includes('list') || lowerMessage.includes('show')) {
                this.listAlarms();
            } else if (lowerMessage.includes('stop') || lowerMessage.includes('snooze')) {
                this.handleStopAlarm();
            } else {
                this.addMessage("I can help you create, delete, or list alarms. What would you like to do?", 'bot');
            }
        } else {
            // Handle non-alarm related requests
            this.handleNonAlarmRequest(lowerMessage);
        }
    }

    // Check if the message is related to alarms
    isAlarmRelated(message) {
        const alarmKeywords = ['alarm', 'wake', 'remind', 'time', 'schedule', 'set', 'create', 'add', 'remove', 'delete', 'cancel', 'list', 'show', 'what', 'stop', 'snooze'];
        return alarmKeywords.some(keyword => message.includes(keyword));
    }

    // Handle non-alarm related requests
    handleNonAlarmRequest(message) {
        // Check for specific non-alarm requests
        if (message.includes('weather') || message.includes('temperature') || message.includes('forecast')) {
            this.addMessage("I'm sorry, I can't provide weather information. I'm designed to help you manage alarms only.", 'bot');
        } else if (message.includes('news') || message.includes('headlines') || message.includes('current events')) {
            this.addMessage("I'm sorry, I can't provide news updates. I'm designed to help you manage alarms only.", 'bot');
        } else if (message.includes('calendar') || message.includes('schedule') || message.includes('events')) {
            this.addMessage("I'm sorry, I can't manage your calendar or events. I'm designed to help you manage alarms only.", 'bot');
        } else if (message.includes('music') || message.includes('play') || message.includes('song')) {
            this.addMessage("I'm sorry, I can't play music for you. I'm designed to help you manage alarms only.", 'bot');
        } else if (message.includes('search') || message.includes('find') || message.includes('look up')) {
            this.addMessage("I'm sorry, I can't search the internet for you. I'm designed to help you manage alarms only.", 'bot');
        } else if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
            this.addMessage("Hello! I can help you manage your alarms. What would you like to do?", 'bot');
        } else if (message.includes('thank') || message.includes('thanks')) {
            this.addMessage("You're welcome! Let me know if you need anything else with your alarms.", 'bot');
        } else if (message.includes('help') || message.includes('what can you do')) {
            this.addMessage("I can help you manage your alarms. You can ask me to:\n- Set an alarm (e.g., 'set an alarm for 7:00 AM')\n- Remove an alarm (e.g., 'remove the 7:00 AM alarm')\n- List all alarms (e.g., 'list all alarms')\n- Stop a ringing alarm (e.g., 'stop the alarm')", 'bot');
        } else {
            // Generic response for any other non-alarm request
            this.addMessage("I'm sorry, I can only help you manage alarms. I can set, remove, or list alarms for you. Is there something specific about alarms you'd like help with?", 'bot');
        }
    }

    // Handle stopping an alarm
    handleStopAlarm() {
        console.log('Handling stop alarm');
        // Find any ringing alarms
        const ringingAlarms = this.alarms.filter(alarm => alarm.isRinging);
        console.log('Ringing alarms:', ringingAlarms);
        
        if (ringingAlarms.length > 0) {
            // Stop the first ringing alarm
            this.stopAlarm(ringingAlarms[0]);
        } else {
            this.addMessage("There are no alarms currently ringing.", 'bot');
        }
    }

    handleCreateAlarm(message) {
        console.log('Handling create alarm with message:', message);
        
        // Check for relative time expressions first
        const relativeTimeMatch = this.parseRelativeTime(message);
        if (relativeTimeMatch) {
            console.log('Found relative time match:', relativeTimeMatch);
            const { hours, minutes, description } = relativeTimeMatch;
            this.createAlarm(hours, minutes, description);
            return;
        }

        // Check for specific day mentions (tomorrow, next Monday, etc.)
        const dayMatch = this.parseDayMention(message);
        if (dayMatch) {
            console.log('Found day mention match:', dayMatch);
            const { hours, minutes, date, description } = dayMatch;
            this.createAlarm(hours, minutes, description, date);
            return;
        }

        // Try to parse "o'clock" format (e.g., "7 o'clock" or "7 o'clock pm")
        const oClockRegex = /(\d{1,2})\s*o['']?clock\s*(am|pm)?/i;
        const oClockMatch = message.match(oClockRegex);
        
        if (oClockMatch) {
            console.log('Found o\'clock match:', oClockMatch);
            let [_, hours, period] = oClockMatch;
            hours = parseInt(hours);
            const minutes = 0;
            
            // Handle AM/PM conversion
            if (period) {
                period = period.toLowerCase();
                if (period === 'pm' && hours < 12) {
                    hours += 12;
                } else if (period === 'am' && hours === 12) {
                    hours = 0;
                }
            }
            
            // Extract description if present (anything after the time)
            let description = '';
            const descriptionMatch = message.match(/(?:\d{1,2})\s*o['']?clock\s*(?:am|pm)?\s*(.+)/i);
            if (descriptionMatch && descriptionMatch[1]) {
                description = descriptionMatch[1].trim();
            }
            
            this.createAlarm(hours, minutes, description);
            return;
        }

        // Try to parse 24-hour format first (e.g., "19:15")
        const time24Regex = /(\d{1,2}):(\d{2})/;
        const time24Match = message.match(time24Regex);
        
        if (time24Match) {
            console.log('Found 24-hour format match:', time24Match);
            let [_, hours, minutes] = time24Match;
            hours = parseInt(hours);
            minutes = parseInt(minutes);
            
            // Validate time values
            if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                // Extract description if present (anything after the time)
                let description = '';
                const descriptionMatch = message.match(/(?:\d{1,2}):(\d{2})\s*(.+)/i);
                if (descriptionMatch && descriptionMatch[2]) {
                    description = descriptionMatch[2].trim();
                }
                
                this.createAlarm(hours, minutes, description);
                return;
            }
        }

        // If not a 24-hour format, try to parse 12-hour format with AM/PM
        const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm)(?:\s+for\s+(.+))?/i;
        const match = message.match(timeRegex);

        if (match) {
            console.log('Found 12-hour format match:', match);
            let [_, hours, minutes, period, description] = match;
            hours = parseInt(hours);
            minutes = minutes ? parseInt(minutes) : 0;
            period = period.toLowerCase();

            // Handle AM/PM conversion
            if (period === 'pm' && hours < 12) {
                hours += 12;
            } else if (period === 'am' && hours === 12) {
                hours = 0;
            }
            
            // Clean up description - remove any remaining AM/PM text
            if (description) {
                description = description.replace(/\s*(am|pm)\s*/i, ' ').trim();
            }
            
            this.createAlarm(hours, minutes, description || '');
        } else {
            console.log('No time format matched');
            this.addMessage("I couldn't understand the time. Please specify the time in format like '7:30 AM', '14:30', '7 o'clock', 'in 5 minutes', or 'tomorrow at 7:30 AM'", 'bot');
        }
    }

    handleDeleteAlarm(message) {
        const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
        const match = message.match(timeRegex);

        if (match) {
            let [_, hours, minutes, period] = match;
            hours = parseInt(hours);
            minutes = minutes ? parseInt(minutes) : 0;

            if (period?.toLowerCase() === 'pm' && hours < 12) {
                hours += 12;
            } else if (period?.toLowerCase() === 'am' && hours === 12) {
                hours = 0;
            }

            // Format the time as HH:MM
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            // Find and delete the alarm
            const alarmIndex = this.alarms.findIndex(alarm => alarm.time === timeString);
            
            if (alarmIndex !== -1) {
                const deletedAlarm = this.alarms[alarmIndex];
                this.alarms.splice(alarmIndex, 1);
                this.saveAlarms();
                this.updateAlarmsList();
                this.addMessage(`I've removed the alarm for ${timeString} with description: ${deletedAlarm.description}`, 'bot');
            } else {
                this.addMessage(`I couldn't find an alarm set for ${timeString}.`, 'bot');
            }
        } else if (message.includes('all')) {
            // Delete all alarms
            this.alarms = [];
            this.saveAlarms();
            this.updateAlarmsList();
            this.addMessage("I've removed all alarms.", 'bot');
        } else {
            this.addMessage("I couldn't understand which alarm to remove. Please specify the time in format like '7:30 AM' or say 'remove all alarms'.", 'bot');
        }
    }

    listAlarms() {
        if (this.alarms.length === 0) {
            this.addMessage("You don't have any alarms set.", 'bot');
        } else {
            let message = "Here are your alarms:\n";
            this.alarms.forEach(alarm => {
                message += `- ${alarm.time}: ${alarm.description}\n`;
            });
            this.addMessage(message, 'bot');
        }
    }

    updateAlarmsList() {
        console.log('Updating alarms list with:', this.alarms);
        this.alarmsList.innerHTML = '';
        
        if (this.alarms.length === 0) {
            this.alarmsList.innerHTML = '<p>No alarms set</p>';
            return;
        }
        
        this.alarms.forEach(alarm => {
            const alarmItem = document.createElement('div');
            alarmItem.className = 'alarm-item';
            
            // Format the alarm display
            let timeDisplay = alarm.time;
            if (alarm.date) {
                const date = new Date(alarm.date);
                const options = { weekday: 'short', month: 'short', day: 'numeric' };
                timeDisplay += ` (${date.toLocaleDateString(undefined, options)})`;
            }
            
            const timeSpan = document.createElement('span');
            timeSpan.textContent = `${timeDisplay}: ${alarm.description}`;
            
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.onclick = () => this.deleteAlarm(alarm.id);
            
            alarmItem.appendChild(timeSpan);
            alarmItem.appendChild(deleteButton);
            this.alarmsList.appendChild(alarmItem);
        });
    }

    deleteAlarm(id) {
        this.alarms = this.alarms.filter(alarm => alarm.id !== id);
        this.saveAlarms();
        this.updateAlarmsList();
    }

    saveAlarms() {
        console.log('Saving alarms to localStorage:', this.alarms);
        localStorage.setItem('alarms', JSON.stringify(this.alarms));
    }

    processVoiceCommand(command) {
        console.log('Processing voice command:', command);
        
        // Handle alarm setting commands
        if (command.toLowerCase().includes('set alarm') || 
            command.toLowerCase().includes('create alarm') || 
            command.toLowerCase().includes('add alarm') ||
            command.toLowerCase().includes('alarm for') ||
            command.toLowerCase().includes('alarm at')) {
            
            this.handleCreateAlarm(command);
        } 
        // Handle alarm stopping commands
        else if (command.toLowerCase().includes('stop alarm') || 
                 command.toLowerCase().includes('turn off alarm') || 
                 command.toLowerCase().includes('cancel alarm') ||
                 command.toLowerCase().includes('snooze alarm')) {
            this.handleStopAlarm();
            this.voiceStatus.textContent = 'Alarm stopped';
        } 
        // Handle alarm listing commands
        else if (command.toLowerCase().includes('list alarms') || 
                 command.toLowerCase().includes('show alarms') || 
                 command.toLowerCase().includes('what alarms') ||
                 command.toLowerCase().includes('display alarms')) {
            this.listAlarms();
            this.voiceStatus.textContent = 'Listing alarms';
        }
        // Handle alarm deletion commands
        else if (command.toLowerCase().includes('delete alarm') || 
                 command.toLowerCase().includes('remove alarm') ||
                 command.toLowerCase().includes('cancel alarm for')) {
            this.handleDeleteAlarm(command);
        }
        else {
            this.voiceStatus.textContent = 'Command not recognized';
            this.addMessage('Command not recognized. Try: "set alarm for 7:30 pm", "stop alarm", "list alarms", or "delete alarm"', 'bot');
        }
    }

    getTimeUntilAlarm(alarmTime) {
        const now = new Date();
        const diff = alarmTime - now;
        
        // Convert to days, hours and minutes
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
        } else {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
    }

    createAlarm(hours, minutes, description, date = null) {
        console.log('Creating alarm with:', { hours, minutes, description, date });
        
        // Format the time as HH:MM
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        console.log('Formatted time string:', timeString);
        
        const alarm = {
            id: Date.now(),
            time: timeString,
            description: description || 'No description',
            isRinging: false,
            date: date ? date.toISOString().split('T')[0] : null // Store date as YYYY-MM-DD
        };
        console.log('Created alarm object:', alarm);

        this.alarms.push(alarm);
        this.saveAlarms();
        this.updateAlarmsList();
        
        // Calculate time until alarm
        const now = new Date();
        let alarmTime = new Date(now);
        alarmTime.setHours(hours);
        alarmTime.setMinutes(minutes);
        
        // If date is provided, set the alarm for that specific date
        if (date) {
            alarmTime = new Date(date);
            alarmTime.setHours(hours);
            alarmTime.setMinutes(minutes);
        } 
        // If the alarm time is earlier today, set it for tomorrow
        else if (alarmTime < now) {
            alarmTime.setDate(alarmTime.getDate() + 1);
        }
        
        const timeUntilAlarm = this.getTimeUntilAlarm(alarmTime);
        console.log('Time until alarm:', timeUntilAlarm);
        
        // Format the date for display
        let dateDisplay = '';
        if (date) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateDisplay = ` on ${date.toLocaleDateString(undefined, options)}`;
        }
        
        this.addMessage(`I've set an alarm for ${timeString}${dateDisplay} (${timeUntilAlarm}) with description: ${alarm.description}`, 'bot');
        
        // Verify the alarm was added
        console.log('Current alarms:', this.alarms);
    }

    parseRelativeTime(message) {
        console.log('Parsing relative time from:', message);
        const relativeTimeRegex = /in\s+(\d+)\s*(minute|hour|min|hr)s?/i;
        const match = message.match(relativeTimeRegex);
        
        if (match) {
            console.log('Found relative time match:', match);
            const amount = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            
            const now = new Date();
            const alarmTime = new Date(now);
            
            if (unit.startsWith('h')) {
                alarmTime.setHours(now.getHours() + amount);
            } else {
                alarmTime.setMinutes(now.getMinutes() + amount);
            }
            
            // Extract description if present (anything after the time expression)
            let description = '';
            const descriptionMatch = message.match(/in\s+\d+\s*(?:minute|hour|min|hr)s?\s*(.+)/i);
            if (descriptionMatch && descriptionMatch[1]) {
                description = descriptionMatch[1].trim();
            }
            
            return {
                hours: alarmTime.getHours(),
                minutes: alarmTime.getMinutes(),
                description: description
            };
        }
        
        return null;
    }

    parseDayMention(message) {
        console.log('Parsing day mention from:', message);
        
        // Match patterns like "tomorrow at 7:30 AM", "next Monday at 3 PM", "on Friday at 10:30"
        const dayRegex = /(?:tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|on\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\s+(?:at\s+)?(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
        const match = message.match(dayRegex);
        
        if (match) {
            console.log('Found day mention match:', match);
            let [_, hours, minutes, period] = match;
            hours = parseInt(hours);
            minutes = minutes ? parseInt(minutes) : 0;
            
            // Handle AM/PM conversion
            if (period) {
                period = period.toLowerCase();
                if (period === 'pm' && hours < 12) {
                    hours += 12;
                } else if (period === 'am' && hours === 12) {
                    hours = 0;
                }
            }
            
            // Calculate the target date
            const now = new Date();
            let targetDate = new Date(now);
            
            // Check if "tomorrow" was mentioned
            if (message.toLowerCase().includes('tomorrow')) {
                targetDate.setDate(now.getDate() + 1);
            } 
            // Check for specific day mentions
            else {
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const currentDay = now.getDay();
                
                // Find the mentioned day
                let targetDay = -1;
                for (let i = 0; i < dayNames.length; i++) {
                    if (message.toLowerCase().includes(dayNames[i])) {
                        targetDay = i;
                        break;
                    }
                }
                
                if (targetDay !== -1) {
                    // If "next" is mentioned, add 7 days to get to next week
                    const isNextWeek = message.toLowerCase().includes('next');
                    
                    // Calculate days until target day
                    let daysUntilTarget = targetDay - currentDay;
                    if (daysUntilTarget <= 0) {
                        daysUntilTarget += 7;
                    }
                    
                    // If "next" is mentioned, add 7 more days
                    if (isNextWeek) {
                        daysUntilTarget += 7;
                    }
                    
                    targetDate.setDate(now.getDate() + daysUntilTarget);
                }
            }
            
            // Extract description if present
            let description = '';
            const descriptionMatch = message.match(/(?:tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|on\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\s+(?:at\s+)?(?:\d{1,2}):?(?:\d{2})?\s*(?:am|pm)?\s*(?:for\s+)?(.+)/i);
            if (descriptionMatch && descriptionMatch[1]) {
                description = descriptionMatch[1].trim();
            }
            
            return {
                hours,
                minutes,
                date: targetDate,
                description
            };
        }
        
        return null;
    }
}

// Initialize the alarm manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing alarm manager...');
    try {
        // Test if all required elements exist
        const elements = {
            chatMessages: document.getElementById('chatMessages'),
            userInput: document.getElementById('userInput'),
            sendButton: document.getElementById('sendButton'),
            voiceButton: document.getElementById('voiceButton'),
            voiceStatus: document.getElementById('voiceStatus'),
            alarmsList: document.getElementById('alarmsList')
        };

        // Log which elements are missing
        Object.entries(elements).forEach(([name, element]) => {
            if (!element) {
                console.error(`Missing element: ${name}`);
            }
        });

        // Only create AlarmManager if all elements exist
        if (Object.values(elements).every(element => element !== null)) {
            window.alarmManager = new AlarmManager();
            console.log('AlarmManager successfully instantiated');
            
            // Request microphone permission for voice recognition
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                console.log('Requesting microphone permission...');
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        console.log('Microphone permission granted');
                        // Stop the stream after getting permission
                        stream.getTracks().forEach(track => track.stop());
                        // Add a message to confirm voice recognition is ready
                        window.alarmManager.addMessage("Voice recognition is ready! Click the microphone button to start.", 'bot');
                    })
                    .catch(err => {
                        console.error('Microphone permission denied:', err);
                        window.alarmManager.addMessage("Microphone permission was denied. Voice commands will not work. Please enable microphone access and refresh the page.", 'bot');
                    });
            }
        } else {
            console.error('Cannot initialize AlarmManager: Some required elements are missing');
        }
    } catch (error) {
        console.error('Error initializing AlarmManager:', error);
    }
});