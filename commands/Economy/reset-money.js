const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class ResetMoney extends Command {
  constructor(client) {
    super(client, {
      name: 'reset-money',
      description: 'Reset the money of a user.',
      category: 'Economy',
      usage: 'Reset-Money [user]',
      aliases: ['resetmoney'],
      guildOnly: true,
    });
  }

  async run(msg, args, level) {
    async function resetBalance(msg, mem) {
      const amount = (await db.get(`servers.${msg.guild.id}.economy.startBalance`)) || 0;
      await db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, amount);
      await db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, 0);
      return true;
    }

    if (!args || args.length < 1) {
      await msg.channel.send('Are you sure you want to reset your money? (yes/no)');
      const verification = await this.client.util.verify(msg.channel, msg.author);
      if (verification) {
        await resetBalance(msg, msg.member);
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

      let mem = await this.client.util.getMember(msg, args.join(' '));

      if (!mem) {
        const fid = args.join(' ').replace(/<@|>/g, '');
        try {
          mem = await this.client.users.fetch(fid);
        } catch (err) {
          return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid User');
        }
      }
      mem = mem.user ? mem.user : mem;

      await msg.channel.send(`Are you sure you want to reset ${mem.tag}'s money? (yes/no)`);
      const verification = await this.client.util.verify(msg.channel, msg.author);
      if (verification) {
        await resetBalance(msg, mem);
        return msg.channel.send(`Successfully reset ${mem.tag}'s money.`);
      } else {
        return msg.channel.send(`Cancelled, ${mem.tag}'s money won't be reset.`);
      }
    }
  }
}

module.exports = ResetMoney;
