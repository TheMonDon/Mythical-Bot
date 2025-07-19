const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Unban extends Command {
  constructor(client) {
    super(client, {
      name: 'unban',
      description: 'Unban a user',
      usage: 'unban <userID> [reason]',
      category: 'Moderator',
      permLevel: 'Moderator',
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.guild.members.me.permissions.has('BanMembers'))
      return msg.channel.send('The bot is missing Ban Members permission.');

    const logChan = await db.get(`servers.${msg.guild.id}.logs.channel`);

    // Regex to check if the input for userID is a number
    const regex = /\d+/g;
    const userID = args[0];
    args.shift();
    const reason = args.join(' ');
    const successColor = msg.settings.embedSuccessColor;

    if (!userID.matches(regex)) return msg.channel.send(`Please provide a valid User ID. \nInput: ${userID}`);
    if (msg.guild.members.me.permissions.has('ManageMessages')) msg.delete();

    try {
      // Fetch the ban list and find the user
      const banList = await msg.guild.fetchBans();
      const bannedUser = banList.find((user) => user.id === userID);

      if (!bannedUser) return msg.channel.send(`The user with the ID ${userID} is not banned.`);

      const unbanP = await msg.guild.members.unban(userID, { reason }).catch((err) => {
        return msg.channel.send(`An error occurred: ${err}`);
      });
      const embed = new EmbedBuilder()
        .setTitle('Member Unbanned')
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setColor(successColor)
        .addFields([
          { name: 'User', value: unbanP.toString() },
          { name: 'Unbanned By', value: msg.member.toString() },
          { name: 'Reason', value: reason },
        ])
        .setFooter({ text: `ID: ${unbanP.id}` })
        .setTimestamp();

      if (logChan) {
        const em2 = new EmbedBuilder()
          .setTitle('User unbanned')
          .setColor(successColor)
          .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
          .setDescription('Full info posted in the log channel.');

        msg.guild.channels.cache.get(logChan).send({ embeds: [embed] });
        return msg.channel.send({ embeds: [em2] }).then((msg) => {
          setTimeout(() => msg.delete(), 30000);
        });
      } else {
        return msg.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      return msg.channel.send(`An error occurred: ${err}`);
    }
  }
}

module.exports = Unban;
