"use client";
import { useState } from "react";
import { Card } from "../shared/card";
import { Toggle } from "../shared/toggle";

// UI-only preferences for now — wire to real user.preferences when we
// add notification scheduling + per-channel publishing controls.
export function PreferencesCard() {
  const [postIg, setPostIg] = useState(true);
  const [postLi, setPostLi] = useState(false);
  const [postEmail, setPostEmail] = useState(true);
  const [needsYouPing, setNeedsYouPing] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const ROW =
    "flex items-center justify-between px-lg py-md hairline-b2 border-border2";

  return (
    <Card padded={false}>
      <div className={ROW}>
        <span className="text-md">post to instagram</span>
        <Toggle on={postIg} onChange={setPostIg} ariaLabel="post to instagram" />
      </div>
      <div className={ROW}>
        <span className="text-md">post to linkedin</span>
        <Toggle on={postLi} onChange={setPostLi} ariaLabel="post to linkedin" />
      </div>
      <div className={ROW}>
        <span className="text-md">send email newsletter</span>
        <Toggle
          on={postEmail}
          onChange={setPostEmail}
          ariaLabel="send email newsletter"
        />
      </div>
      <div className={ROW}>
        <span className="text-md">ping me when something needs me</span>
        <Toggle
          on={needsYouPing}
          onChange={setNeedsYouPing}
          ariaLabel="ping me when something needs me"
        />
      </div>
      <div className="flex items-center justify-between px-lg py-md">
        <span className="text-md">weekly report on sundays</span>
        <Toggle
          on={weeklyReport}
          onChange={setWeeklyReport}
          ariaLabel="weekly report on sundays"
        />
      </div>
    </Card>
  );
}
