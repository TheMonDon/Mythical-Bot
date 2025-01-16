const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class ResetMoney extends Command {
  constructor(client) {
    super(client, {
      name: 'reset-money',
      description: 'Reset the money of a user',
      category: 'Economy',
      usage: 'reset-money [user]',
      aliases: ['resetmoney'],
      guildOnly: true,
    });
  }

  async run(msg, args, level) {
    async function resetBalance(msg, mem) {
      const amount = (await db.get(`servers.${msg.guild.id}.economy.startBalance`)) || '0';
      await db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, amount);
      await db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, '0');
      return true;
    }

    if (!args || args.length < 1) {
      const reply = await msg.channel.send('Are you sure you want to reset your money? (yes/no)');
      const verification = await this.client.util.verify(msg.channel, msg.author);
      if (verification) {
        await reply.edit('Resetting money...');
        await resetBalance(msg, msg.member);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
        return await reply.edit('Your money has been reset.');
      } else {
        return msg.channel.send('Cancelled, your money will not be reset.');
      }
    } else {
      if (level < this.client.levelCache.Administrator) {
        return msg.channel.send(`You do not have permission to use this command.
Your permission level is ${level} (${this.client.config.permLevels.find((l) => l.level === level).name})
This command requires level ${this.client.levelCache.Administrator} (Administrator)`);
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

      const reply = await msg.channel.send(`Are you sure you want to reset ${mem.tag}'s money? (yes/no)`);
      const verification = await this.client.util.verify(msg.channel, msg.author);
      if (verification) {
        await reply.edit('Resetting money...');
        await resetBalance(msg, mem);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
        return await reply.edit(`Successfully reset ${mem.tag}'s money.`);
      } else {
        return msg.channel.send(`Cancelled, ${mem.tag}'s money won't be reset.`);
      }
    }
  }
}

module.exports = ResetMoney;
