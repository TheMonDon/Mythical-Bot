const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class Unban extends Command {
  constructor (client) {
    super(client, {
      name: 'unban',
      description: 'Unban a member',
      usage: 'unban <userID> [reason]',
      category: 'Moderator',
      guildOnly: true
    });
  }

  async run (msg, args) {
    if (!msg.member.permissions.has('BAN_MEMBERS')) return msg.channel.send('You are missing the BAN_MEMBERS permission.');
    if (!msg.guild.members.me.permissions.has('BAN_MEMBERS')) return msg.channel.send('The bot is missing BAN_MEMBERS permission.');

    if (!args || args.length < 1) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}unban <userID> [reason]`);
    const logChan = db.get(`servers.${msg.guild.id}.logging.channel`);

    const regex = /\d+/g;
    const userID = args[0];
    args.shift();
    const reason = args.join(' ');

    if (!userID.matches(regex)) return msg.channel.send(`Error: Please enter a valid User ID. \nInput: ${userID}`);

    const embed = new EmbedBuilder();
    if (msg.guild.members.me.permissions.has('MANAGE_MESSAGES')) msg.delete();

    try {
      const banList = await msg.guild.fetchBans();
      const bannedUser = banList.find(user => user.id === userID);

      if (!bannedUser) return msg.channel.send(`The user with the ID ${userID} is not banned.`);

      msg.guild.unban(userID, reason)
        .then(unbanP => {
          embed
            .setTitle('Member Unbanned')
            .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
            .setColor('#00FF00')
            .addFields([
              { name: 'User', value: unbanP.toString() },
              { name: 'Unbanned By', value: msg.member.toString() },
              { name: 'Reason', value: reason }
            ])
            .setFooter({ text: `ID: ${unbanP.id}` })
            .setTimestamp();
          if (logChan) msg.guild.channels.cache.get(logChan).send({ embeds: [embed] });

          return msg.channel.send({ embeds: [embed] });
        });
    } catch (err) {
      return msg.channel.send(`An error occurred: ${err}`);
    }
  }
}

module.exports = Unban;
