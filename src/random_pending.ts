import { RetRandomEntry, RetRandomPoll, RetRandomCancel, WhoGoesFirst } from "cerke_online_api";
import { API_ORIGIN } from "./env";

const UNLOAD_TRIGGERED_BY_USER: boolean = true;


/////////////////////////////////////////////////////////
// The following function magically does the following:
//
// a. if the page is out of focus:
//    1. The current token is revoked
//    2. Somehow a new token is generated
//
// b.
document.addEventListener("visibilitychange", () => {
  if (!UNLOAD_TRIGGERED_BY_USER) {
    // should only capture what has been triggered by the user
    return;
  }

  if (document.visibilityState === "hidden") {
    // cancel if out of focus
    if (typeof RESULT !== "undefined") {
      const token = RESULT.access_token;
      RESULT = undefined;
      (async () => {
        console.log(`trying to cancel ${token}:`);
        const newRes: RetRandomCancel = await sendCancel<RetRandomCancel>(
          token as AccessToken,
          (a) => a,
        );
        console.log(`got result ${JSON.stringify(newRes)}`);
      })();
    }
  } else {
    // re-register if focused
    if (typeof RESULT === "undefined") {
      apply_for_random_game();
    }
  }
});

type AccessToken = string & { __AccessTokenBrand: never };
function let_the_game_begin(
  access_token: AccessToken,
  is_first_move_my_move: WhoGoesFirst,
  is_IA_down_for_me: boolean,
) {
  sessionStorage.vs = "someone";
  sessionStorage.access_token = access_token;
  sessionStorage.is_first_move_my_move = JSON.stringify(is_first_move_my_move);
  sessionStorage.is_IA_down_for_me = JSON.stringify(is_IA_down_for_me);
  location.href = "main.html";
}

let RESULT: RetRandomEntry | undefined;

function apply_for_random_game() {
  (async () => {
    let res: RetRandomEntry = await sendEntrance<RetRandomEntry>((a) => a);
    RESULT = res;
    while (res.type !== "LetTheGameBegin") {
      await new Promise((resolve) =>
        setTimeout(resolve, (2 + Math.random()) * 200 * 0.8093),
      );
      const newRes: RetRandomPoll = await sendPoll<RetRandomPoll>(
        res.access_token as AccessToken,
        (a) => a,
      );
      if (newRes.type !== "Err") {
        res = newRes.ret;
        RESULT = res;
      } else {
        // re-entry
        res = await sendEntrance<RetRandomEntry>((a) => a);
        RESULT = res;
      }
    }
    let_the_game_begin(
      res.access_token as AccessToken,
      res.is_first_move_my_move,
      res.is_IA_down_for_me,
    );
  })();
}

async function sendPoll<U>(
  access_token: AccessToken,
  validateInput: (response: any) => U,
): Promise<U> {
  return await sendSomethingSomewhere(
    location.href.includes("staging")
      ? `${API_ORIGIN}/matching/random/poll/staging`
      : `${API_ORIGIN}/matching/random/poll`,
    {
      access_token,
    },
    validateInput,
  );
}

async function sendCancel<U>(
  access_token: AccessToken,
  validateInput: (response: any) => U,
): Promise<U> {
  return await sendSomethingSomewhere(
    location.href.includes("staging")
      ? `${API_ORIGIN}/matching/random/cancel/staging`
      : `${API_ORIGIN}/matching/random/cancel`,
    {
      access_token,
    },
    validateInput,
  );
}

async function sendSomethingSomewhere<T, U>(
  url: string,
  data: T,
  validateInput: (response: any) => U,
): Promise<U> {
  const res: void | U = await fetch(url, {
    method: "POST",
    body: JSON.stringify(data), // data can be `string` or {object}!
    headers: {
      "Content-Type": "application/json",
    },
    keepalive: true,
  })
    .then((res) => res.json())
    .then(validateInput)
    .catch((error) => {
      console.error("Error:", error);
      return;
    });

  console.log(res);

  if (!res) {
    alert("network error!");
    throw new Error("network error!");
  }
  return res;
}

async function sendEntrance<U>(
  validateInput: (response: any) => U,
): Promise<U> {
  return await sendSomethingSomewhere(
    location.href.includes("staging")
      ? `${API_ORIGIN}/matching/random/entry/staging`
      : `${API_ORIGIN}/matching/random/entry`,
    {},
    validateInput,
  );
}

apply_for_random_game();
