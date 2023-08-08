import pkg from '../../config.js';
import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
import { scheduleJob } from 'node-schedule';
import { BotlistMeClient } from 'botlist.me.js';
const { BotListToken } = pkg;
const db = new QuickDB();

export async function run(client) {
  if (!client.settings.has('default')) {
    if (!client.config.defaultSettings)
      throw new Error('defaultSettings not preset in config.js or settings database. Bot cannot load.');
    client.settings.set('default', client.config.defaultSettings);
  }

  client.user.setActivity(`${client.settings.get('default').prefix}help | ${client.guilds.cache.size} Servers`);

  client.games.clear();
  client.logger.log(`${client.user.tag}, ready to serve ${client.guilds.cache.size} guilds.`, 'ready');

  if (BotListToken?.length > 0) {
    const botlistme = new BotlistMeClient(BotListToken, client);
    botlistme.postStats(client.guilds.cache.size);

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
            const channel = client.channels.cache.get(channelID);
            const user = await client.users.fetch(userID);
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
