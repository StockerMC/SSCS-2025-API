require('dotenv').config();
const fs = require('fs');
const path = require('path')
const admin = require("firebase-admin");
const express = require('express')
const cors = require("cors");
const { createClient } = require('@supabase/supabase-js');

const app = express()

app.use(express.json());
app.use(cors());

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be set in environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey)

const serviceAccount = require("../serviceAccountKey.json");

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Partial Push Notification
async function sendPartialNotification(token, data) {
  return admin.messaging().send({
    token,
    data: {
      type: "partial_notification",
      notifee: JSON.stringify({
        body: data,
        android: {
          channelId: "default",
        },
      }),
    },
  });
}

// Declare a notification route
app.post("/notifications", async (req, res) => {
  try {
    const data = req.body;
    console.log(data);

    const { data: userData, error } = await supabase
      .from('tokens')
      .select('fcm_token')
      .eq('device_unique_id', 'test')
      .single();
    
    if (error || !userData) {
      console.error('Error fetching token from Supabase:', error);
      return res.status(404).json({ error: "User not found or token not available" });
    }
    
    const token = userData.fcm_token;
    if (!token) {
      return res.status(400).json({ error: "FCM token not found for user" });
    }
    
    await sendPartialNotification(token, data);
    res.json({status: "OK"});
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/", async (req, res) => {
  res.send("OK");
});

const port = 4321
app.listen(port, () => {
  console.log(`listening on port ${port}`)
})

module.exports = app;
