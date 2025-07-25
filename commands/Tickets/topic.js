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
    const server = msg.guild;
    if (!(await db.get(`servers.${msg.guild.id}.tickets`)))
      return msg.channel.send('The ticket system has not been setup in this server.');

    if (!msg.channel.name.startsWith('ticket'))
      return msg.channel.send('You need to be inside the ticket you want to change the topic of.');

    let topic = args.join(' ');
    topic = topic.slice(0, 1024);

    const { roleID } = await db.get(`servers.${msg.guild.id}.tickets`);
    const role = msg.guild.roles.cache.get(roleID);
    const owner = await db.get(`servers.${msg.guild.id}.tickets.${msg.channel.id}.owner`);

    if (owner !== msg.author.id) {
      if (!msg.member.roles.cache.some((r) => r.id === roleID)) {
        return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to change the topic.`);
      }
    }

    const cooldown = 300; // 5 minutes
    let channelCooldown = (await db.get(`servers.${server.id}.tickets.${msg.channel.id}.tCooldown`)) || {};

    if (channelCooldown.active) {
      const timeleft = channelCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > cooldown * 1000) {
        // this is to check if the bot restarted before their cooldown was set.
        channelCooldown = {};
        channelCooldown.active = false;
        await db.set(`servers.${server.id}.tickets.${msg.channel.id}.tCooldown`, channelCooldown);
      } else {
        const tLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]'); // format to any format

        const embed = new EmbedBuilder()
          .setColor(msg.settings.embedErrorColor)
          .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
          .setDescription(`You can't change the topic for another ${tLeft}`);

        return msg.channel.send({ embeds: [embed] });
      }
    }

    await msg.channel.setTopic(topic);

    const em = new EmbedBuilder()
      .setTitle('Topic Changed')
      .setColor('#E65DF4')
      .setDescription(`${msg.author} has changed the topic to: \n${topic}`);
    await msg.channel.send({ embeds: [em] });

    channelCooldown.time = Date.now() + cooldown * 1000;
    channelCooldown.active = true;
    await db.set(`servers.${server.id}.tickets.${msg.channel.id}.tCooldown`, channelCooldown);

    setTimeout(async () => {
      channelCooldown = { active: false };
      await db.set(`servers.${server.id}.tickets.${msg.channel.id}.tCooldown`, channelCooldown);
    }, cooldown * 1000);
  }
}

module.exports = Topic;
