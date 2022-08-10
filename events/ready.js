const { EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');
const db = require('quick.db');
const { scheduleJob } = require('node-schedule');
const { BotListToken } = require('../config.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run () {
    // Check whether the "Default" guild settings are loaded in the enmap.
    // If they're not, write them in. This should only happen on first load.
    if (!this.client.settings.has('default')) {
      if (!this.client.config.defaultSettings) throw new Error('defaultSettings not preset in config.js or settings database. Bot cannot load.');
      this.client.settings.set('default', this.client.config.defaultSettings);
    }

    // Set the game as the default help command + guild count.
    this.client.user.setActivity(`${this.client.settings.get('default').prefix}help | ${this.client.guilds.cache.size} Servers`);

    // Log that we're ready to serve, so we know the bot accepts commands.
    this.client.logger.log(`${this.client.user.tag}, ready to serve ${this.client.guilds.cache.size} guilds.`, 'ready');

    const BotlistMeClient = require('botlist.me.js');
    const botlistme = new BotlistMeClient(BotListToken, this.client);
    botlistme.postStats(this.client.guilds.cache.size);

    // Optional events
    botlistme.on('posted', () => {
      console.log('Server count posted!');
    });

    botlistme.on('error', e => {
      console.log(`Oops! ${e}`);
    });

    // Now begins by new reminder system!
    scheduleJob('Reminders', '* * * * *', async () => {
      const reminders = db.get('global.reminders') || [];
      if (reminders) {
        for (const { createdAt, triggerOn, reminder, channelID, userID, color, remID } of Object.values(reminders)) {
          const now = Date.now();

          if (triggerOn <= now) {
            try {
              const channel = this.client.channels.cache.get(channelID);
              const user = this.client.users.cache.get(userID);

              const em = new EmbedBuilder()
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setColor(color)
                .addFields([{ name: 'Reminder', value: `\`\`\`${reminder}\`\`\`` }])
                .setFooter({ text: 'You created this reminder @' })
                .setTimestamp(new DateTime(createdAt).toLocaleString(DateTime.DATETIME_FULL));
              channel ? channel.send({ embeds: [em], content: `<@${userID}>, here's your reminder:` }) : user.send({ embeds: [em], content: `${user.username}, here's your reminder:` });
              db.delete(`global.reminders.${remID}`);
            } catch {
              return;
            }
          }
        }
      }
    });
  }
};
