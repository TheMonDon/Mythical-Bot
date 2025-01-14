const Command = require('../../base/Command.js');

class Nickname extends Command {
  constructor(client) {
    super(client, {
      name: 'nickname',
      description: 'Change the nickname of a member',
      usage: 'nickname <User> [Nickname]',
      category: 'Moderator',
      permLevel: 'Moderator',
      aliases: ['nick'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.guild.members.me.permissions.has('ManageNicknames'))
      return msg.channel.send("The bot doesn't have Manage Nicknames permission.");

    const infoMem = await this.client.util.getMember(msg, args[0]);
    const owner = await msg.guild.fetchOwner();

    if (!infoMem) return msg.channel.send('That user was not found.');
    if (infoMem.id === owner.user.id)
      return msg.channel.send('Only the owner of the server can change their nickname.');
    if (infoMem.roles.highest.position > msg.guild.members.me.roles.highest.position - 1)
      return msg.channel.send('I need my role higher to change that users nickname.');
    if (infoMem.roles.highest.position > msg.member.roles.highest.position - 1) {
      return msg.channel.send('You cannot change the nickname of someone with a higher role than you.');
    }

    args.shift();
    const nick = args.join(' ');

    if (nick) {
      const oldNick = infoMem.nickname || infoMem.user.username;
      await infoMem.setNickname(nick);
      return msg.channel.send(`Changed old nickname \`${oldNick}\` to \`${nick}\``);
    }

    await infoMem.setNickname('');
    return msg.channel.send(`Reset the nickname of ${infoMem.user.username}`);
  }
}

module.exports = Nickname;
