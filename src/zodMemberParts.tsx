import { ModelProperty } from "@typespec/compiler";
import { Typekit } from "@typespec/compiler/typekit";
import { useTsp } from "@typespec/emitter-framework";
import { TSValueExpression } from "./components/TSValueExpression.jsx";
import { callPart } from "./utils.jsx";

export function zodMemberParts(member?: ModelProperty) {
  const { $ } = useTsp();
  return [...optionalParts($, member), ...defaultParts($, member)];
}

function defaultParts($: Typekit, member?: ModelProperty) {
  if (!member || !member.defaultValue) {
    return [];
  }

  return [
    callPart("default", [<TSValueExpression value={member.defaultValue} />]),
  ];
}
function optionalParts($: Typekit, member?: ModelProperty) {
  if (!member || !member.optional) {
    return [];
  }

  return [callPart("optional")];
}
