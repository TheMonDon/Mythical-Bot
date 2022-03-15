const DiscordJS = require('discord.js');
const moment = require('moment');
const db = require('quick.db');
const { scheduleJob } = require('node-schedule');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run () {
    // Why await here? Because the ready event isn't actually ready, sometimes
    // guild information will come in *after* ready. 1s is plenty, generally,
    // for all of them to be loaded.
    await this.client.wait(1000);

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

              const em = new DiscordJS.MessageEmbed()
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setColor(color)
                .addField('Reminder', `\`\`\`${reminder}\`\`\``)
                .setFooter({ text: 'You created this reminder @' })
                .setTimestamp(moment(createdAt));
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
