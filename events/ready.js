/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
/* global intervalTimeout */
const DiscordJS = require('discord.js');
const moment = require('moment');
const db = require('quick.db');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run () {
    // Why await here? Because the ready event isn't actually ready, sometimes
    // guild information will come in *after* ready. 1s is plenty, generally,
    // for all of them to be loaded.
    await this.client.wait(1000);

    // This loop ensures that client.appInfo always contains up to date data
    // about the app's status. This includes whether the bot is public or not,
    // its description, owner, etc. Used for the dashboard amongs other things.
    this.client.appInfo = await this.client.fetchApplication();
    setInterval(async () => {
      this.client.appInfo = await this.client.fetchApplication();
    }, 60000);

    // Check whether the "Default" guild settings are loaded in the enmap.
    // If they're not, write them in. This should only happen on first load.
    if (!this.client.settings.has('default')) {
      if (!this.client.config.defaultSettings) throw new Error('defaultSettings not preset in config.js or settings database. Bot cannot load.');
      this.client.settings.set('default', this.client.config.defaultSettings);
    }

    // Set the game as the default help command + guild count.
    // NOTE: This is also set in the guildCreate and guildDelete events!
    this.client.user.setActivity(`${this.client.settings.get('default').prefix}help | ${this.client.guilds.cache.size} Servers`);

    // Log that we're ready to serve, so we know the bot accepts commands.
    this.client.logger.log(`${this.client.user.tag}, ready to serve ${this.client.users.cache.size} users in ${this.client.guilds.cache.size} servers.`, 'ready');

    // This is for reminders.
    const _this = this;

    // 30 second timeout so that the above loop doesn't go on forever. Too lazy to actually fix it, so this is a stopgap measure.
    setTimeout(function () {
      clearTimeout(intervalTimeout);
    }, 30000);

    // db.get(`users.${member.id}.timers.remindme`);
    const usersObj = db.get('users') || [];
    global.usersObj = usersObj;
    let usersObjValues = Object.values(usersObj);
    global.usersObjValues = usersObjValues;
    usersObjValues = usersObjValues.filter(a => a.timers).map(a => a.timers);
    usersObjValues = usersObjValues.map(a => a.remindme).filter(Boolean);
    for (let i = 0; i < usersObjValues.length; i++) {
      const an = usersObjValues[i].length;
      for (let ii = 0; ii < an; ii++) {
        // It largely doesn't matter if the reminder is supposed to be over or not, considering the bot itself has restarted.
        // if ((usersObjValues[i][ii] && usersObjValues[i][ii].remindingTimestamp - Date.now()) < 0) {
        (function (index, num) {
          usersObjValues = usersObjValues.filter(Boolean);
          setTimeout(function () {
            if (!usersObjValues[index][num].disabled && !usersObjValues[index][num].completed) {
              const topic = usersObjValues[index][num];
              const topicmsg = (String(topic.message).length > 1000) ? `${String(topic.message).substring(0, 996)} ...` : String(topic.message);
              const chan = _this.client.channels.cache.get(topic.channelID);
              const em = new DiscordJS.MessageEmbed();

              em.setAuthor(topic.username, topic.avatarURL);
              em.addField('Reminder', `\`\`\`${topicmsg}\`\`\``);
              em.setFooter('You created this reminder @');
              em.setTimestamp(moment(topic.createdAtTimestamp));

              if (chan) { // If channel still exists:
                chan.send(`<@${topic.userID}>`, em);
                // c(`${usersObjValues[index][num].message} (${usersObjValues[index][num].userID})`)
              } else { // Channel doesn't exist, so let's try to DM the user.
                try { // check if user exists
                  _this.client.users.cache.get(String(topic.userID)).send(`${topic.username}, here's your reminder:`, em).catch(() => null);
                } catch {
                  // do nothing.
                }
              }

              usersObjValues[index][num].completed = true;
              const rems = db.get(`users.${usersObjValues[index][num].userID}.timers.remindme`);
              rems[num].completed = true;
              db.set(`users.${usersObjValues[index][num].userID}.timers.remindme`, rems);
            }
            delete usersObjValues[index][num];
          }, Math.max(Math.min(usersObjValues[index][num].remindingTimestamp - Date.now(), 2147483647), 0));
        })(i, ii);
        // }
      }
    }
    // Setup a SetInterval to check every 1 second to see if all reminders have been re-sent out/re-established.
    global.intervalTimeout = setInterval(function () {
      const arr_reminders_left = usersObjValues.map(a => a.filter(Boolean));
      const isEmpty = !!usersObjValues.some(arr2 => arr2.length);

      if (isEmpty) { // no empty objects in any nested array.
        console.log('All reminders have now been sent out again or re-established.');
        // Okay, now we need to remove all reminders that have expired, considering all of them have been completed.
        const fullobj = db.get('users'); // get full users object.
        const ok = Object.keys(fullobj); // gets values/keys of the object (for it's length and ID index properties).
        for (let i = 0; i < ok.length; i++) { // iterate through object.
          if (fullobj[ok[i]] && fullobj[ok[i]].timers && fullobj[ok[i]].timers.remindme) { // check if object entry has a remindme timestamp associated with it or not.
            const cnt = fullobj[ok[i]].timers.remindme.length; // # of reminders that user has.
            for (let ii = 0; ii < cnt; ii++) { // iterate through each reminder the user has.
              if (((fullobj[ok[i]].timers.remindme[ii] && fullobj[ok[i]].timers.remindme[ii].remindingTimestamp) - Date.now()) < 0) { // If reminder has already passed, delete it. This is okay since we already re-established / re-sent it out.
                delete fullobj[ok[i]].timers.remindme[ii]; // delete the entry.
              }
              fullobj[ok[i]].timers.remindme = fullobj[ok[i]].timers.remindme.filter(Boolean);
            }
          }
        }
        db.set('users', fullobj); // potentially unnecessary method, so long as I use a different method below to complete each reminder.
        console.log("All prior reminders have been sent out, or re-instated if they haven't expired yet.");
        clearTimeout(intervalTimeout);
      }
    }, 1000);
  }
};
