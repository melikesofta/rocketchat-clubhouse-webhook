const MENTION_ALL_ALLOWED = false;

// Name of your workspace in Clubhouse
const WORKSPACE_NAME = '{name_of_your_workspace}';

// Mapping of Clubhouse member uuid's to rocketchat usernames
const MEMBER_NAMES_BY_UUID = {
  "{member_uuid_from_clubhouse}": "{your_rocket_chat_username}"
};

const BASE_URL = `https://app.clubhouse.io/${WORKSPACE_NAME}`;
const IGNORED_KEYS = ["workflow_state_id"];

class Script {
  process_incoming_request({ request }) {
    try {
      const { content, url } = request;
      const channel = url.query.channel;
      const { member_id, actions } = content;
      const userName = MEMBER_NAMES_BY_UUID[member_id] || member_id;

      let result = this.determineResultByActions(actions, userName);

      if (result && result.content && channel) {
        result.content.channel = '#' + channel;
      }

      return result;
    } catch (e) {
      return Script.getErrorMessage(e);
    }
  }

  determineResultByActions(actions, userName) {
    const action = actions[0];
    const text = this.generateTextByAction(action, userName);

    return {
      content: {
        username: "Clubhouse Bot",
        text: text,
        attachments: [
          {
            title: `${action.name} [${action.id}]`,
            title_link: `${BASE_URL}/${action.entity_type}/${action.id}`,
            text: "",
            image_url: "",
            color: "#764FA5"
          }
        ]
      }
    };
  }

  generateTextByAction(action, userName) {
    let text = `${action.action} action by ${userName ? `@${userName}` : "unknown user"} on ${action.entity_type} "${action.name}".`;

    text = `${text}\n\nChanges:\n`;

    for (let changeKey in action.changes) {
      const change = action.changes[changeKey];

      if (!change) {
        return "Parse Error";
      }

      if (IGNORED_KEYS.includes(changeKey)) {
        // Do nothing.
      } else if (change.hasOwnProperty("old") || change.hasOwnProperty("new")) {
        if (change.old === change.new) {
          // Some values are sent in the response by default, like `completed_at from 0 to 0` when it's set to `done`.
          // Here we ignore the values that didn't change.
        } else {
          text += `- *${changeKey}* from *${change.old}* to *${change.new}*\n`;
        }
      } else if (change.adds) {
        text += `- added *${changeKey}* ${this.determineChangeValueByChangeKey(change.adds, changeKey)}\n`
      } else if (change.removes) {
        text += `- removed *${changeKey}* ${this.determineChangeValueByChangeKey(change.removes, changeKey)}\n`
      } else {
        text += `- Key(s) not implemented: ${Object.keys(change)}\n`;
      }
    }

    return text;
  }

  determineChangeValueByChangeKey(changedValues, changeKey) {
    if ("owner_ids" === changeKey) {
      return changedValues.map(changedValue => {
        if (MEMBER_NAMES_BY_UUID[changedValue]) {
          return `@${MEMBER_NAMES_BY_UUID[changedValue]}`;
        } else {
          return changedValue;
        }
      }).join(", ");
    } else {
      return changedValues.join("")
    }
  }

  static getErrorMessage(error) {
    return {
      content: {
        username: 'Clubhouse Bot',
        text: 'Error occured parsing the request.',
        attachments: [
          {
            text: `Error: '${error}', \n Message: '${error.message}', \n Stack: '${error.stack}'`
          }
        ]
      }
    };
  }
}
