const Command = require('../../base/Command.js');

class Premium extends Command {
  constructor(client) {
    super(client, {
      name: 'premium',
      description: 'Enable or disable premium for a server or user',
      category: 'Bot Admin',
      permLevel: 'Bot Admin',
      usage: 'premium <server|user> <ID|mention> <enable|disable>',
      examples: ['premium server 12345678901234567 enable', 'premium user @someone disable'],
      requiredArgs: 3,
    });
  }

  async run(msg, [targetType, target, action]) {
    const type = targetType?.toLowerCase();
    const normalizedAction = action?.toLowerCase();
    const id = target?.replace(/^<@!?|>$/g, '');

    if (!['server', 'user'].includes(type) || !['enable', 'disable'].includes(normalizedAction)) {
      return this.client.util.errorEmbed(msg, `${msg.settings?.prefix || ''}${this.help.usage}`, 'Incorrect Usage');
    }

    if (!/^\d{17,20}$/.test(id || '')) {
      return this.client.util.errorEmbed(msg, 'Provide a valid Discord server or user ID.', 'Invalid ID');
    }

    const enabled = normalizedAction === 'enable';
    const table = type === 'server' ? 'server_settings' : 'user_settings';
    const idColumn = type === 'server' ? 'server_id' : 'user_id';

    await this.client.db.execute(
      /* sql */ `
        INSERT INTO
          ${table} (${idColumn}, premium)
        VALUES
          (?, ?) ON DUPLICATE KEY
        UPDATE premium =
        VALUES
          (premium)
      `,
      [id, enabled],
    );

    return msg.channel.send(`Premium has been ${normalizedAction}d for ${type} \`${id}\`.`);
  }
}

module.exports = Premium;
