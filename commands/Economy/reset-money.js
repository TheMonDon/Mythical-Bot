const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class ResetMoney extends Command {
  constructor(client) {
    super(client, {
      name: 'reset-money',
      description: 'Reset the money of a user.',
      category: 'Economy',
      usage: 'Reset-Money [user]',
      aliases: ['resetmoney', 'rm'],
      guildOnly: true,
    });
  }

  async run(msg, text, level) {
    if (!text || text.length < 1) {
      await msg.channel.send('Are you sure you want to reset your money? (yes/no)');
      const verification = await this.client.util.verify(msg.channel, msg.author);
      if (verification) {
        const amount = db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, amount);
        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`, 0);
        return msg.channel.send('Your money has been reset.');
      } else {
        return msg.channel.send('Cancelled, your money will not be reset.');
      }
    } else {
      if (level < this.client.levelCache.Moderator) {
        if (this.client.settings.systemNotice === 'true') {
          return msg.channel.send(`You do not have permission to use this command.
  Your permission level is ${level} (${this.client.config.permLevels.find((l) => l.level === level).name})
  This command requires level ${this.client.levelCache.Moderator} (Moderator)`);
        } else {
          return;
        }
      }

      let mem = await this.client.util.getMember(msg, text.join(' '));

      if (!mem) {
        const fid = text.join(' ').replace('<@', '').replace('>', '');
        try {
          mem = await this.client.users.fetch(fid);
        } catch (err) {
          const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
          const embed = new EmbedBuilder()
            .setColor(msg.settings.embedErrorColor)
            .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
            .setDescription(`That user was not found. \nUsage: ${msg.settings.prefix}Reset-Money <user>`);
          return msg.channel.send({ embeds: [embed] });
        }
      }
      mem = mem.user ? mem.user : mem;
      const memberName = mem.discriminator === '0' ? mem.username : mem.tag;

      await msg.channel.send(`Are you sure you want to reset ${memberName}'s money? (yes/no)`);
      const verification = await this.client.util.verify(msg.channel, msg.author);
      if (verification) {
        const amount = db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
        db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, amount);
        db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, 0);
        return msg.channel.send(`Successfully reset ${memberName}'s money.`);
      } else {
        return msg.channel.send(`Cancelled, ${memberName}'s money won't be reset.`);
      }
    }
  }
}

module.exports = ResetMoney;
