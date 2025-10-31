// Firebase Konfiguration für hep Lernplattform
// WICHTIG: Ersetze die Werte mit deinen eigenen Firebase-Daten!

const firebaseConfig = {
  apiKey: "AIzaSyCkZrz7ey9NHT12of09ytwGokXBTU6ccTM",
  authDomain: "hep-erbschaftssteuer.firebaseapp.com",
  databaseURL: "https://hep-erbschaftssteuer-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hep-erbschaftssteuer",
  storageBucket: "hep-erbschaftssteuer.firebasestorage.app",
  messagingSenderId: "818988344975",
  appId: "1:818988344975:web:562007dd963667402f72fa"
};

// Firebase initialisieren (nur einmal)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Referenz zur Datenbank
const database = firebase.database();

// ==========================================
// TRACKING FUNKTIONEN
// ==========================================

// Aktuellen User-Code aus localStorage holen
function getCurrentUserCode() {
    return localStorage.getItem('userCode') || 'anonymous';
}

// Zeitstempel erstellen
function getTimestamp() {
    return new Date().toISOString();
}

// 1. Seite als abgeschlossen markieren
function trackPageCompletion(pageName) {
    const userCode = getCurrentUserCode();
    const timestamp = getTimestamp();
    
    database.ref(`users/${userCode}/completions/${pageName}`).set({
        completed: true,
        timestamp: timestamp
    }).then(() => {
        console.log(`✅ Seite "${pageName}" als abgeschlossen markiert`);
    }).catch(error => {
        console.error('Fehler beim Tracking:', error);
    });
}

// 2. Quiz-Ergebnis speichern
function trackQuizResult(pageName, score, maxScore, answers) {
    const userCode = getCurrentUserCode();
    const timestamp = getTimestamp();
    
    database.ref(`users/${userCode}/quizzes/${pageName}`).set({
        score: score,
        maxScore: maxScore,
        percentage: Math.round((score / maxScore) * 100),
        answers: answers || [],
        timestamp: timestamp
    }).then(() => {
        console.log(`✅ Quiz-Ergebnis gespeichert: ${score}/${maxScore}`);
    }).catch(error => {
        console.error('Fehler beim Quiz-Tracking:', error);
    });
}

// 3. Like/Meinung speichern
function trackLike(pageName, opinion) {
    const userCode = getCurrentUserCode();
    const timestamp = getTimestamp();
    
    database.ref(`users/${userCode}/opinions/${pageName}`).set({
        opinion: opinion, // z.B. "pro", "contra", "neutral"
        timestamp: timestamp
    }).then(() => {
        console.log(`✅ Meinung gespeichert: ${opinion}`);
    }).catch(error => {
        console.error('Fehler beim Opinion-Tracking:', error);
    });
}

// 4. Verweildauer tracken
function trackTimeSpent(pageName, seconds) {
    const userCode = getCurrentUserCode();
    
    database.ref(`users/${userCode}/timeSpent/${pageName}`).set({
        seconds: seconds,
        timestamp: getTimestamp()
    }).then(() => {
        console.log(`✅ Verweildauer gespeichert: ${seconds}s`);
    }).catch(error => {
        console.error('Fehler beim Time-Tracking:', error);
    });
}

// 5. Media-Konsum tracken (Audio/Video)
function trackMediaWatched(pageName, mediaType, percentage) {
    const userCode = getCurrentUserCode();
    
    database.ref(`users/${userCode}/media/${pageName}`).set({
        type: mediaType, // 'audio' oder 'video'
        percentageWatched: percentage,
        timestamp: getTimestamp()
    }).then(() => {
        console.log(`✅ Media-Konsum gespeichert: ${percentage}%`);
    }).catch(error => {
        console.error('Fehler beim Media-Tracking:', error);
    });
}

// ==========================================
// DASHBOARD DATEN ABRUFEN
// ==========================================

// Alle User-Daten abrufen (für Dashboard)
async function getAllUsersData() {
    try {
        const snapshot = await database.ref('users').once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error('Fehler beim Abrufen der User-Daten:', error);
        return {};
    }
}

// Statistiken für eine bestimmte Seite
async function getPageStats(pageName) {
    try {
        const allUsers = await getAllUsersData();
        let totalUsers = 0;
        let completedCount = 0;
        let totalTimeSpent = 0;
        let opinions = { pro: 0, contra: 0, neutral: 0 };
        let quizScores = [];
        
        Object.entries(allUsers).forEach(([userCode, userData]) => {
            totalUsers++;
            
            // Completions
            if (userData.completions && userData.completions[pageName]) {
                completedCount++;
            }
            
            // Time spent
            if (userData.timeSpent && userData.timeSpent[pageName]) {
                totalTimeSpent += userData.timeSpent[pageName].seconds;
            }
            
            // Opinions
            if (userData.opinions && userData.opinions[pageName]) {
                const opinion = userData.opinions[pageName].opinion;
                if (opinions[opinion] !== undefined) {
                    opinions[opinion]++;
                }
            }
            
            // Quiz scores
            if (userData.quizzes && userData.quizzes[pageName]) {
                quizScores.push(userData.quizzes[pageName].percentage);
            }
        });
        
        return {
            totalUsers,
            completedCount,
            completionRate: totalUsers > 0 ? Math.round((completedCount / totalUsers) * 100) : 0,
            averageTimeSpent: totalUsers > 0 ? Math.round(totalTimeSpent / totalUsers) : 0,
            opinions,
            averageQuizScore: quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0,
            quizScores
        };
    } catch (error) {
        console.error('Fehler beim Abrufen der Statistiken:', error);
        return null;
    }
}

// Leaderboard erstellen
async function getLeaderboard() {
    try {
        const allUsers = await getAllUsersData();
        const leaderboard = [];
        
        Object.entries(allUsers).forEach(([userCode, userData]) => {
            let totalScore = 0;
            let completionsCount = 0;
            let quizzesCompleted = 0;
            let totalQuizScore = 0;
            
            // Completions zählen
            if (userData.completions) {
                completionsCount = Object.keys(userData.completions).length;
            }
            
            // Quiz-Scores
            if (userData.quizzes) {
                const quizzes = Object.values(userData.quizzes);
                quizzesCompleted = quizzes.length;
                totalQuizScore = quizzes.reduce((sum, quiz) => sum + (quiz.percentage || 0), 0);
            }
            
            // Gesamt-Score berechnen
            totalScore = (completionsCount * 100) + totalQuizScore;
            
            leaderboard.push({
                userCode,
                totalScore,
                completionsCount,
                quizzesCompleted,
                averageQuizScore: quizzesCompleted > 0 ? Math.round(totalQuizScore / quizzesCompleted) : 0
            });
        });
        
        // Sortieren nach totalScore (höchster zuerst)
        leaderboard.sort((a, b) => b.totalScore - a.totalScore);
        
        return leaderboard;
    } catch (error) {
        console.error('Fehler beim Erstellen des Leaderboards:', error);
        return [];
    }
}

// ==========================================
// HILFSFUNKTIONEN
// ==========================================

// Prüfen ob User eingeloggt ist
function isUserLoggedIn() {
    return localStorage.getItem('userCode') !== null;
}

// Zur Login-Seite weiterleiten falls nicht eingeloggt
function requireLogin() {
    if (!isUserLoggedIn()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Timer für Verweildauer starten
function startTimeTracking(pageName) {
    const startTime = Date.now();
    
    window.addEventListener('beforeunload', () => {
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        trackTimeSpent(pageName, timeSpent);
    });
}

console.log('🔥 Firebase Config geladen und bereit!');
