class AlarmManager {
    constructor() {
        this.alarms = JSON.parse(localStorage.getItem('alarms')) || [];
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.alarmsList = document.getElementById('alarmsList');
        this.alarmSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        this.alarmSound.loop = true;

        this.setupEventListeners();
        this.updateAlarmsList();
        this.startAlarmChecker();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.handleUserInput());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUserInput();
            }
        });
    }

    startAlarmChecker() {
        setInterval(() => {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            this.alarms.forEach(alarm => {
                if (alarm.time === currentTime && !alarm.isRinging) {
                    this.triggerAlarm(alarm);
                }
            });
        }, 1000); // Check every second
    }

    triggerAlarm(alarm) {
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
        stopButton.onclick = () => this.stopAlarm(alarm);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot alarm-message';
        messageDiv.innerHTML = `🔔 ALARM: ${alarm.description} at ${alarm.time}`;
        messageDiv.appendChild(stopButton);
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    stopAlarm(alarm) {
        // Stop the alarm sound
        this.alarmSound.pause();
        this.alarmSound.currentTime = 0;
        
        // Update alarm state
        alarm.isRinging = false;
        this.saveAlarms();
        
        // Remove all alarm-related messages
        const alarmMessages = document.querySelectorAll('.alarm-message');
        alarmMessages.forEach(msg => {
            if (msg.textContent.includes(alarm.time)) {
                msg.remove();
            }
        });

        // Add a confirmation message
        this.addMessage(`Alarm stopped: ${alarm.description} at ${alarm.time}`, 'bot');
        
        // Update the alarms list to reflect the stopped state
        this.updateAlarmsList();
    }

    handleUserInput() {
        const message = this.userInput.value.trim();
        if (!message) return;

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
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('create') || lowerMessage.includes('set') || lowerMessage.includes('add')) {
            this.handleCreateAlarm(message);
        } else if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
            this.handleDeleteAlarm(message);
        } else if (lowerMessage.includes('list') || lowerMessage.includes('show')) {
            this.listAlarms();
        } else {
            this.addMessage("I can help you create, delete, or list alarms. What would you like to do?", 'bot');
        }
    }

    handleCreateAlarm(message) {
        // Check for relative time expressions first
        const relativeTimeMatch = this.parseRelativeTime(message);
        if (relativeTimeMatch) {
            const { hours, minutes, description } = relativeTimeMatch;
            this.createAlarm(hours, minutes, description);
            return;
        }

        // If not a relative time, try to parse absolute time
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

            // Extract description if present
            const description = message.split(/at|for|about/i)[1]?.trim() || 'No description';
            
            this.createAlarm(hours, minutes, description);
        } else {
            this.addMessage("I couldn't understand the time. Please specify the time in format like '7:30 AM', '14:30', or 'in 5 minutes'", 'bot');
        }
    }

    parseRelativeTime(message) {
        // Match patterns like "in 5 minutes", "in 2 hours", "in 1 hour and 30 minutes"
        const relativeTimeRegex = /in\s+(\d+)\s+(hour|hours|minute|minutes)(?:\s+and\s+(\d+)\s+(minute|minutes))?/i;
        const match = message.match(relativeTimeRegex);
        
        if (!match) return null;
        
        let hours = 0;
        let minutes = 0;
        
        // Parse the first time unit
        const firstValue = parseInt(match[1]);
        const firstUnit = match[2].toLowerCase();
        
        if (firstUnit.startsWith('hour')) {
            hours = firstValue;
        } else if (firstUnit.startsWith('minute')) {
            minutes = firstValue;
        }
        
        // Parse the second time unit if present
        if (match[3] && match[4]) {
            const secondValue = parseInt(match[3]);
            const secondUnit = match[4].toLowerCase();
            
            if (secondUnit.startsWith('minute')) {
                minutes = secondValue;
            }
        }
        
        // Extract description if present
        const description = message.split(/in\s+\d+\s+(hour|hours|minute|minutes)/i)[1]?.trim() || 'No description';
        
        return { hours, minutes, description };
    }

    createAlarm(hours, minutes, description) {
        // Calculate the actual time for the alarm
        const now = new Date();
        const alarmTime = new Date(now);
        
        // Add the hours and minutes to the current time
        alarmTime.setHours(alarmTime.getHours() + hours);
        alarmTime.setMinutes(alarmTime.getMinutes() + minutes);
        
        // Format the time as HH:MM
        const timeString = `${alarmTime.getHours().toString().padStart(2, '0')}:${alarmTime.getMinutes().toString().padStart(2, '0')}`;
        
        const alarm = {
            id: Date.now(),
            time: timeString,
            description: description,
            isRinging: false
        };

        this.alarms.push(alarm);
        this.saveAlarms();
        this.updateAlarmsList();
        
        // Calculate time until alarm
        const timeUntilAlarm = this.getTimeUntilAlarm(alarmTime);
        this.addMessage(`I've set an alarm for ${timeString} (${timeUntilAlarm}) with description: ${alarm.description}`, 'bot');
    }

    getTimeUntilAlarm(alarmTime) {
        const now = new Date();
        const diffMs = alarmTime - now;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        
        if (diffHours > 0) {
            return `in ${diffHours} hour${diffHours > 1 ? 's' : ''} and ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}`;
        } else {
            return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
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

            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            const initialLength = this.alarms.length;
            this.alarms = this.alarms.filter(alarm => alarm.time !== timeString);

            if (this.alarms.length < initialLength) {
                this.saveAlarms();
                this.updateAlarmsList();
                this.addMessage(`I've removed the alarm for ${timeString}`, 'bot');
            } else {
                this.addMessage(`I couldn't find an alarm for ${timeString}`, 'bot');
            }
        } else {
            this.addMessage("Please specify which alarm you want to delete by providing the time", 'bot');
        }
    }

    listAlarms() {
        if (this.alarms.length === 0) {
            this.addMessage("You don't have any alarms set.", 'bot');
            return;
        }

        let message = "Here are your alarms:\n";
        this.alarms.forEach(alarm => {
            message += `• ${alarm.time} - ${alarm.description}\n`;
        });
        this.addMessage(message, 'bot');
    }

    updateAlarmsList() {
        this.alarmsList.innerHTML = '';
        this.alarms.forEach(alarm => {
            const alarmDiv = document.createElement('div');
            alarmDiv.className = 'alarm-item';
            alarmDiv.innerHTML = `
                <span>${alarm.time} - ${alarm.description}</span>
                <button onclick="alarmManager.deleteAlarm(${alarm.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            this.alarmsList.appendChild(alarmDiv);
        });
    }

    deleteAlarm(id) {
        this.alarms = this.alarms.filter(alarm => alarm.id !== id);
        this.saveAlarms();
        this.updateAlarmsList();
        this.addMessage("Alarm deleted successfully!", 'bot');
    }

    saveAlarms() {
        localStorage.setItem('alarms', JSON.stringify(this.alarms));
    }
}

// Initialize the alarm manager
const alarmManager = new AlarmManager();