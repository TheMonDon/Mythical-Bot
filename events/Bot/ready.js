const { BotListToken } = require('../../config.js');
const { scheduleJob } = require('node-schedule');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run() {
    if (!this.client.settings.has('default')) {
      if (!this.client.config.defaultSettings)
        throw new Error('defaultSettings not preset in config.js or settings database. Bot cannot load.');
      this.client.settings.set('default', this.client.config.defaultSettings);
    }

    this.client.user.setActivity(
      `${this.client.settings.get('default').prefix}help | ${this.client.guilds.cache.size} Servers`,
    );

    this.client.games.clear();
    this.client.logger.log(`${this.client.user.tag}, ready to serve ${this.client.guilds.cache.size} guilds.`, 'ready');

    if (BotListToken?.length > 0) {
      const BotlistMeClient = require('botlist.me.js');
      const botlistme = new BotlistMeClient(BotListToken, this.client);
      botlistme.postStats(this.client.guilds.cache.size);

      botlistme.on('posted', () => {
        console.log('Server count posted!');
      });

      botlistme.on('error', (e) => {
        console.log(`Oops! ${e}`);
      });
    }

    // Reminder scheduler
    scheduleJob('Reminders', '* * * * *', async () => {
      const reminders = (await db.get('global.reminders')) || [];
      if (reminders) {
        for (const { createdAt, triggerOn, reminder, channelID, userID, color, remID } of Object.values(reminders)) {
          const now = Date.now();

          if (triggerOn <= now) {
            try {
              const channel = this.client.channels.cache.get(channelID);
              const user = await this.client.users.fetch(userID);
              if (!user) return;

              const em = new EmbedBuilder()
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setColor(color)
                .addFields([{ name: 'Reminder', value: `\`\`\`${reminder}\`\`\`` }])
                .setFooter({ text: 'You created this reminder @' })
                .setTimestamp(createdAt);
              channel
                ? channel.send({ embeds: [em], content: `<@${userID}>, here's your reminder:` })
                : user.send({ embeds: [em], content: `${user.username}, here's your reminder:` });
              await db.delete(`global.reminders.${remID}`);
            } catch (err) {
              console.error(err);
            }
          }
        }
      }
    });
  }
};
