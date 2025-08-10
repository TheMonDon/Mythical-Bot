const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
require('moment-duration-format');
const moment = require('moment');
const db = new QuickDB();

class Topic extends Command {
  constructor(client) {
    super(client, {
      name: 'topic',
      description: 'Change the topic of your ticket',
      usage: 'topic <New Topic>',
      category: 'Tickets',
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();
    const [rows] = await connection.execute(`SELECT * FROM ticket_settings WHERE server_id = ?`, [msg.guild.id]);
    const [cooldownRows] = await connection.execute(`SELECT * FROM user_tickets WHERE server_id = ? AND user_id = ?`, [
      msg.guild.id,
      msg.author.id,
    ]);
    const channelCooldown = {
      active: cooldownRows[0]?.topic_cooldown || false,
      time: cooldownRows[0]?.cooldown_until || null,
    };

    if (rows.length === 0) {
      connection.release();
      return msg.channel.send('The ticket system has not been setup in this server.');
    }

    if (!msg.channel.name.startsWith('ticket')) {
      connection.release();
      return msg.channel.send('You need to be inside the ticket you want to change the topic of.');
    }

    let topic = args.join(' ');
    topic = topic.slice(0, 1024);

    const roleID = rows[0].role_id;
    const role = msg.guild.roles.cache.get(roleID);
    const owner = await db.get(`servers.${msg.guild.id}.tickets.${msg.channel.id}.owner`);

    if (owner !== msg.author.id) {
      if (!msg.member.roles.cache.some((r) => r.id === roleID)) {
        return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to change the topic.`);
      }
    }

    const cooldown = 300; // 5 minutes

    if (channelCooldown.active) {
      const timeleft = channelCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > cooldown * 1000) {
        await connection.execute(
          `UPDATE user_tickets
           SET topic_cooldown = FALSE, cooldown_until = NULL
           WHERE server_id = ? AND channel_id = ? AND user_id = ?`,
          [msg.guild.id, msg.channel.id, msg.author.id],
        );
      } else {
        const tLeft = moment.duration(timeleft).format('m[ minutes][ and] s[ seconds]');

        const embed = new EmbedBuilder()
          .setColor(msg.settings.embedErrorColor)
          .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
          .setDescription(`You can't change the topic for another ${tLeft}`);

        connection.release();
        return msg.channel.send({ embeds: [embed] });
      }
    }

    await msg.channel.setTopic(topic);

    const em = new EmbedBuilder()
      .setTitle('Topic Changed')
      .setColor(msg.settings.embedColor)
      .setDescription(`${msg.author} has changed the topic to: \n${topic}`);
    await msg.channel.send({ embeds: [em] });

    await connection.execute(
      `INSERT INTO user_tickets (server_id, channel_id, user_id, topic_cooldown, cooldown_until)
       VALUES (?, ?, ?, TRUE, ?)
       ON DUPLICATE KEY UPDATE
         topic_cooldown = TRUE,
         cooldown_until = VALUES(cooldown_until)`,
      [msg.guild.id, msg.channel.id, msg.author.id, Date.now() + cooldown * 1000],
    );
    connection.release();

    setTimeout(async () => {
      const connection = await this.client.db.getConnection();
      await connection.execute(
        `UPDATE user_tickets
         SET topic_cooldown = FALSE, cooldown_until = NULL
         WHERE server_id = ? AND channel_id = ? AND user_id = ?`,
        [msg.guild.id, msg.channel.id, msg.author.id],
      );
      connection.release();
    }, cooldown * 1000);
  }
}

module.exports = Topic;
